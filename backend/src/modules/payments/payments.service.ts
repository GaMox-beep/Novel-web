import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MomoService } from './providers/momo.service';
import { VnpayService } from './providers/vnpay.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MomoIpnDto } from './dto/momo-ipn.dto';
import { Transaction, TransactionStatus, PaymentMethod } from '@prisma/client';
import { randomUUID } from 'crypto';
import type {
  IPaymentProvider,
  CallbackVerificationResult,
} from './interfaces/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Map<PaymentMethod, IPaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly momoService: MomoService,
    private readonly vnpayService: VnpayService,
  ) {
    this.providers = new Map<PaymentMethod, IPaymentProvider>([
      [PaymentMethod.MOMO, this.momoService],
      [PaymentMethod.VNPAY, this.vnpayService],
    ]);
  }

  private getProvider(method: PaymentMethod): IPaymentProvider {
    const provider = this.providers.get(method);
    if (!provider) {
      throw new BadRequestException(
        `Phương thức thanh toán không được hỗ trợ: ${method}`,
      );
    }
    return provider;
  }

  /**
   * Lấy danh sách các gói nạp đang hoạt động
   */
  async getPackages() {
    return this.prisma.rechargePackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Tạo đơn nạp tiền và sinh URL thanh toán (MoMo hoặc VNPay)
   */
  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
    ipAddress = '127.0.0.1',
  ) {
    const pkg = await this.prisma.rechargePackage.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new BadRequestException(
        'Gói nạp không tồn tại hoặc đã ngừng kích hoạt',
      );
    }

    const prefix = dto.paymentMethod === PaymentMethod.VNPAY ? 'VNP' : 'MOMO';
    const orderId = `${prefix}_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const requestId = randomUUID();
    const totalCoins = pkg.coins + pkg.bonusCoins;

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        orderId,
        requestId,
        amount: pkg.amount,
        coins: totalCoins,
        status: TransactionStatus.PENDING,
        paymentMethod: dto.paymentMethod,
        packageId: pkg.id,
      },
    });

    const provider = this.getProvider(dto.paymentMethod);
    const orderInfo = `Nạp ${totalCoins.toLocaleString('vi-VN')} Linh Thạch (${pkg.name})`;

    const paymentResponse = await provider.createPaymentUrl({
      orderId,
      requestId,
      amount: pkg.amount,
      orderInfo,
      ipAddress,
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { payUrl: paymentResponse.payUrl },
    });

    return {
      orderId,
      requestId,
      amount: pkg.amount,
      coins: totalCoins,
      paymentMethod: dto.paymentMethod,
      payUrl: paymentResponse.payUrl,
    };
  }

  /**
   * Idempotent Payment Completion Core Logic
   * Sử dụng PostgreSQL row lock `SELECT ... FOR UPDATE` trong Prisma transaction
   */
  async completePayment(
    orderId: string,
    gatewayTransId: string | number,
    paidAmount: number,
    isSuccess: boolean,
  ): Promise<Transaction> {
    return await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Transaction[]>`
        SELECT * FROM "transactions" WHERE "orderId" = ${orderId} FOR UPDATE
      `;
      const transaction = rows[0];

      if (!transaction) {
        throw new NotFoundException(
          `Giao dịch không tồn tại với orderId: ${orderId}`,
        );
      }

      // Idempotency: Không cộng trùng nếu đã thành công
      if (transaction.status === TransactionStatus.SUCCESS) {
        this.logger.log(
          `Transaction ${orderId} already completed successfully. Idempotent return.`,
        );
        return transaction;
      }

      if (isSuccess) {
        // Defense-in-depth: Kiểm tra số tiền khớp với đơn hàng trong DB
        if (Number(paidAmount) !== transaction.amount) {
          this.logger.error(
            `CRITICAL: Amount mismatch on orderId ${orderId}: expected ${transaction.amount}, got ${paidAmount}`,
          );
          return await tx.transaction.update({
            where: { orderId },
            data: { status: TransactionStatus.FAILED },
          });
        }

        const updatedTx = await tx.transaction.update({
          where: { orderId },
          data: {
            status: TransactionStatus.SUCCESS,
            transId: String(gatewayTransId || ''),
          },
        });

        // Cộng Linh Thạch cho User atomically
        await tx.user.update({
          where: { id: transaction.userId },
          data: { coins: { increment: transaction.coins } },
        });

        this.logger.log(
          `Successfully credited ${transaction.coins} coins to user ${transaction.userId} for order ${orderId}`,
        );

        return updatedTx;
      } else {
        return await tx.transaction.update({
          where: { orderId },
          data: { status: TransactionStatus.FAILED },
        });
      }
    });
  }

  /**
   * Helper xác thực chữ ký callback và hoàn tất đơn hàng
   */
  private async verifyAndCompletePayment(
    provider: IPaymentProvider,
    payload: Record<string, unknown>,
  ): Promise<CallbackVerificationResult> {
    const result = provider.verifyCallback(payload);
    if (result.isValid) {
      await this.completePayment(
        result.orderId,
        result.transId,
        result.amount,
        result.isPaid,
      );
    }
    return result;
  }

  /**
   * Xử lý IPN Webhook từ MoMo
   */
  async handleMomoIpn(ipnDto: MomoIpnDto) {
    this.logger.log(
      `Received MoMo IPN for orderId: ${ipnDto.orderId}, resultCode: ${ipnDto.resultCode}`,
    );

    const result = await this.verifyAndCompletePayment(
      this.momoService,
      ipnDto as unknown as Record<string, unknown>,
    );

    if (!result.isValid) {
      this.logger.warn(`Invalid IPN signature for orderId: ${ipnDto.orderId}`);
      throw new BadRequestException('Invalid MoMo signature');
    }

    return { message: 'Received', resultCode: 0 };
  }

  /**
   * Xử lý IPN Webhook từ VNPay
   */
  async handleVnpayIpn(query: Record<string, unknown>) {
    const txnRef =
      typeof query['vnp_TxnRef'] === 'string' ? query['vnp_TxnRef'] : '';
    const responseCode =
      typeof query['vnp_ResponseCode'] === 'string'
        ? query['vnp_ResponseCode']
        : '';
    this.logger.log(
      `Received VNPay IPN for orderId: ${txnRef}, ResponseCode: ${responseCode}`,
    );

    try {
      const result = await this.verifyAndCompletePayment(
        this.vnpayService,
        query,
      );

      if (!result.isValid) {
        this.logger.warn(`Invalid VNPay IPN signature for orderId: ${txnRef}`);
        return { RspCode: '97', Message: 'Checksum failed' };
      }

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        return { RspCode: '01', Message: 'Order not found' };
      }
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  /**
   * Xác thực và hoàn tất đơn nạp khi người dùng chuyển hướng về trang kết quả (/nap/ket-qua)
   */
  async verifyPayment(
    userId: string,
    orderId: string,
    queryParams?: Record<string, unknown>,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      throw new NotFoundException('Giao dịch không tồn tại');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền kiểm tra đơn hàng này');
    }

    if (transaction.status === TransactionStatus.SUCCESS) {
      return {
        success: true,
        message: 'Giao dịch đã được ghi nhận thành công',
        transaction,
      };
    }

    if (transaction.status === TransactionStatus.FAILED) {
      return {
        success: false,
        message: 'Giao dịch thất bại',
        transaction,
      };
    }

    const provider = this.getProvider(transaction.paymentMethod);

    // 1. Fast-path: Đối soát chữ ký & parse callback payload từ client
    if (queryParams && Object.keys(queryParams).length > 0) {
      const result = provider.verifyCallback(queryParams);
      if (result.isValid) {
        this.logger.log(
          `Fast-path verification for order ${orderId}: isPaid=${result.isPaid}`,
        );

        const updatedTx = await this.completePayment(
          orderId,
          result.transId,
          result.amount,
          result.isPaid,
        );

        return {
          success: result.isPaid,
          message: result.isPaid
            ? 'Thanh toán thành công'
            : 'Thanh toán không thành công',
          transaction: updatedTx,
        };
      }
    }

    // 2. Fallback: Query Server-to-Server
    const queryRes = await provider.queryTransactionStatus(
      orderId,
      transaction.requestId,
    );

    const updatedTx = await this.completePayment(
      orderId,
      queryRes.transId,
      queryRes.amount,
      queryRes.isPaid,
    );

    return {
      success: queryRes.isPaid,
      message:
        queryRes.message ||
        (queryRes.isPaid
          ? 'Thanh toán thành công'
          : 'Thanh toán không thành công'),
      transaction: updatedTx,
    };
  }

  /**
   * Lấy danh sách lịch sử nạp của người dùng có phân trang
   */
  async getUserTransactions(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          orderId: true,
          amount: true,
          coins: true,
          status: true,
          paymentMethod: true,
          transId: true,
          packageId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.transaction.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
