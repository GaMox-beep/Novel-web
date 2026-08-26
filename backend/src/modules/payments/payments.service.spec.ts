import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MomoService } from './providers/momo.service';
import { VnpayService } from './providers/vnpay.service';
import { PaymentMethod, TransactionStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: any;
  let vnpayService: any;

  beforeEach(async () => {
    const mockPrisma = {
      rechargePackage: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
    };

    const mockMomo = {
      createPaymentUrl: jest.fn(),
      verifyCallback: jest.fn(),
      queryTransactionStatus: jest.fn(),
    };

    const mockVnpay = {
      createPaymentUrl: jest.fn(),
      verifyCallback: jest.fn(),
      queryTransactionStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MomoService, useValue: mockMomo },
        { provide: VnpayService, useValue: mockVnpay },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
    vnpayService = module.get(VnpayService);
  });

  describe('getPackages', () => {
    it('should return active recharge packages ordered by sortOrder', async () => {
      const mockPackages = [
        { id: 'pkg-1', name: 'Gói Nhập Môn', amount: 20000, isActive: true },
      ];
      prismaService.rechargePackage.findMany.mockResolvedValue(mockPackages);

      const result = await service.getPackages();

      expect(prismaService.rechargePackage.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result).toEqual(mockPackages);
    });
  });

  describe('createPayment', () => {
    it('should throw BadRequestException if package does not exist or is inactive', async () => {
      prismaService.rechargePackage.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment('user-1', {
          packageId: 'pkg-invalid',
          paymentMethod: PaymentMethod.VNPAY,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a pending transaction and return payUrl for VNPay', async () => {
      const mockPkg = {
        id: 'pkg-1',
        name: 'Gói Tu Sĩ',
        amount: 50000,
        coins: 500,
        bonusCoins: 50,
        isActive: true,
      };
      prismaService.rechargePackage.findUnique.mockResolvedValue(mockPkg);

      prismaService.transaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        amount: 50000,
        coins: 550,
        status: TransactionStatus.PENDING,
      });

      vnpayService.createPaymentUrl.mockResolvedValue({
        payUrl: 'https://sandbox.vnpayment.vn/pay?token=xyz',
        orderId: 'VNP_123',
      });

      prismaService.transaction.update.mockResolvedValue({});

      const result = await service.createPayment('user-1', {
        packageId: 'pkg-1',
        paymentMethod: PaymentMethod.VNPAY,
      });

      expect(prismaService.transaction.create).toHaveBeenCalled();
      expect(vnpayService.createPaymentUrl).toHaveBeenCalled();
      expect(result.payUrl).toBe('https://sandbox.vnpayment.vn/pay?token=xyz');
      expect(result.coins).toBe(550);
    });
  });

  describe('completePayment', () => {
    it('should be idempotent and return transaction immediately if already SUCCESS', async () => {
      const mockTx = {
        id: 'tx-1',
        orderId: 'ORDER_123',
        status: TransactionStatus.SUCCESS,
        coins: 500,
        userId: 'user-1',
      };

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRaw: jest.fn().mockResolvedValue([mockTx]),
          transaction: { update: jest.fn() },
          user: { update: jest.fn() },
        };
        return callback(txMock);
      });

      const result = await service.completePayment(
        'ORDER_123',
        'GATEWAY_999',
        50000,
        true,
      );

      expect(result.status).toBe(TransactionStatus.SUCCESS);
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should mark transaction FAILED if paid amount does not match expected amount', async () => {
      const mockTx = {
        id: 'tx-1',
        orderId: 'ORDER_123',
        status: TransactionStatus.PENDING,
        amount: 50000,
        coins: 500,
        userId: 'user-1',
      };

      let capturedTxUpdate: any;

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRaw: jest.fn().mockResolvedValue([mockTx]),
          transaction: {
            update: jest.fn().mockImplementation((args) => {
              capturedTxUpdate = args;
              return { ...mockTx, status: args.data.status };
            }),
          },
          user: { update: jest.fn() },
        };
        return callback(txMock);
      });

      const result = await service.completePayment(
        'ORDER_123',
        'GATEWAY_999',
        20000, // Mismatch (expected 50000)
        true,
      );

      expect(result.status).toBe(TransactionStatus.FAILED);
      expect(capturedTxUpdate.data.status).toBe(TransactionStatus.FAILED);
    });

    it('should mark SUCCESS and atomically increment user coins on valid payment', async () => {
      const mockTx = {
        id: 'tx-1',
        orderId: 'ORDER_123',
        status: TransactionStatus.PENDING,
        amount: 50000,
        coins: 550,
        userId: 'user-1',
      };

      let userCoinIncrement: any;

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRaw: jest.fn().mockResolvedValue([mockTx]),
          transaction: {
            update: jest.fn().mockResolvedValue({
              ...mockTx,
              status: TransactionStatus.SUCCESS,
              transId: 'GATEWAY_999',
            }),
          },
          user: {
            update: jest.fn().mockImplementation((args) => {
              userCoinIncrement = args;
              return {};
            }),
          },
        };
        return callback(txMock);
      });

      const result = await service.completePayment(
        'ORDER_123',
        'GATEWAY_999',
        50000,
        true,
      );

      expect(result.status).toBe(TransactionStatus.SUCCESS);
      expect(userCoinIncrement).toEqual({
        where: { id: 'user-1' },
        data: { coins: { increment: 550 } },
      });
    });
  });

  describe('verifyPayment', () => {
    it('should throw ForbiddenException if order belongs to a different user', async () => {
      prismaService.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        orderId: 'ORDER_123',
        userId: 'different-user',
        status: TransactionStatus.PENDING,
      });

      await expect(
        service.verifyPayment('user-1', 'ORDER_123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return success immediately if transaction is already marked SUCCESS in DB', async () => {
      const mockTx = {
        id: 'tx-1',
        orderId: 'ORDER_123',
        userId: 'user-1',
        status: TransactionStatus.SUCCESS,
      };
      prismaService.transaction.findUnique.mockResolvedValue(mockTx);

      const result = await service.verifyPayment('user-1', 'ORDER_123');

      expect(result.success).toBe(true);
      expect(result.transaction).toEqual(mockTx);
    });
  });

  describe('getUserTransactions', () => {
    it('should return paginated transactions with selective fields', async () => {
      const mockItems = [
        {
          id: 'tx-1',
          userId: 'user-1',
          orderId: 'VNP_123',
          amount: 50000,
          coins: 550,
          status: TransactionStatus.SUCCESS,
          paymentMethod: PaymentMethod.VNPAY,
          createdAt: new Date(),
        },
      ];

      prismaService.transaction.findMany.mockResolvedValue(mockItems);
      prismaService.transaction.count.mockResolvedValue(1);

      const result = await service.getUserTransactions('user-1', 1, 10);

      expect(result.items.length).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });
});
