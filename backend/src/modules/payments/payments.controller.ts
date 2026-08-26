import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { MomoIpnDto } from './dto/momo-ipn.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Public: Lấy danh sách các gói nạp hoạt động
   */
  @Get('packages')
  async getPackages() {
    return this.paymentsService.getPackages();
  }

  /**
   * Protected: Tạo đơn nạp tiền và lấy URL cổng thanh toán (MoMo hoặc VNPay)
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    const rawIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const clientIp = rawIp
      .split(',')[0]
      .trim()
      .replace(/^::ffff:/, '');

    return this.paymentsService.createPayment(userId, dto, clientIp);
  }

  /**
   * Protected: Xác thực trạng thái đơn hàng khi user trở về trang kết quả (/nap/ket-qua)
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(
      userId,
      dto.orderId,
      dto.queryParams,
    );
  }

  /**
   * Protected: Lấy lịch sử nạp tiền của chính user
   */
  @Get('my-transactions')
  @UseGuards(JwtAuthGuard)
  async getMyTransactions(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.paymentsService.getUserTransactions(userId, page, limit);
  }

  /**
   * Public: Webhook nhận thông báo IPN từ MoMo
   */
  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  async handleMomoIpn(@Body() ipnDto: MomoIpnDto) {
    return this.paymentsService.handleMomoIpn(ipnDto);
  }

  /**
   * Public: Webhook nhận thông báo IPN từ VNPay (hỗ trợ cả GET & POST)
   */
  @Get('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  async handleVnpayIpnGet(@Query() query: Record<string, unknown>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Post('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  async handleVnpayIpnPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.paymentsService.handleVnpayIpn({ ...query, ...body });
  }
}
