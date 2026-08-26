import { Test, TestingModule } from '@nestjs/testing';
import { ChaptersService } from './chapters.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ChaptersService — VIP & Coin Economy Loop', () => {
  let service: ChaptersService;
  let prisma: any;

  const mockPrismaService = {
    chapter: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    novel: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    unlockedChapter: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChaptersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChaptersService>(ChaptersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Content Access & Preview Resolution', () => {
    const sampleNovel = {
      id: 'novel-1',
      title: 'Tu Chân Giới',
      slug: 'tu-chan-gioi',
      authorName: 'Thiên Cổ',
      coverUrl: null,
    };

    const fullContent =
      'Đoạn 1: Trời đất mênh mông, vạn dặm mây mù.\n\nĐoạn 2: Thiếu niên đứng trên đỉnh núi nhìn xuống trần gian.\n\nĐoạn 3: Bí kíp tuyệt thế võ học xuất hiện ở đây.';

    it('should return full content for a free chapter (isVip: false)', async () => {
      prisma.novel.findUnique.mockResolvedValue(sampleNovel);
      prisma.chapter.findUnique.mockResolvedValue({
        id: 'chap-1',
        novelId: 'novel-1',
        chapterNumber: 1,
        title: 'Chương 1: Khởi đầu',
        content: fullContent,
        views: 10,
        isVip: false,
        price: 0,
      });
      prisma.chapter.update.mockResolvedValue({});
      prisma.novel.update.mockResolvedValue({});
      prisma.chapter.findFirst.mockResolvedValue(null);

      const result = await service.findByNovelSlugAndNumber(
        'tu-chan-gioi',
        1,
        null,
      );

      expect(result.isUnlocked).toBe(true);
      expect(result.content).toBe(fullContent);
      expect(result.isVip).toBe(false);
    });

    it('should return truncated preview for guest on VIP chapter', async () => {
      prisma.novel.findUnique.mockResolvedValue(sampleNovel);
      prisma.chapter.findUnique.mockResolvedValue({
        id: 'chap-2',
        novelId: 'novel-1',
        chapterNumber: 2,
        title: 'Chương 2: Bí Kíp',
        content: fullContent,
        views: 20,
        isVip: true,
        price: 5,
      });
      prisma.chapter.update.mockResolvedValue({});
      prisma.novel.update.mockResolvedValue({});
      prisma.chapter.findFirst.mockResolvedValue(null);

      const result = await service.findByNovelSlugAndNumber(
        'tu-chan-gioi',
        2,
        null,
      );

      expect(result.isUnlocked).toBe(false);
      expect(result.isVip).toBe(true);
      expect(result.price).toBe(5);
      // Truncated preview should contain first 2 paragraphs only
      expect(result.content).not.toContain('Đoạn 3');
      expect(result.content).toContain('Đoạn 1');
      expect(result.content).toContain('Đoạn 2');
    });

    it('should return full content for ADMIN on VIP chapter without unlocking', async () => {
      prisma.novel.findUnique.mockResolvedValue(sampleNovel);
      prisma.chapter.findUnique.mockResolvedValue({
        id: 'chap-2',
        novelId: 'novel-1',
        chapterNumber: 2,
        title: 'Chương 2: Bí Kíp',
        content: fullContent,
        views: 20,
        isVip: true,
        price: 5,
      });
      prisma.chapter.update.mockResolvedValue({});
      prisma.novel.update.mockResolvedValue({});
      prisma.chapter.findFirst.mockResolvedValue(null);

      const result = await service.findByNovelSlugAndNumber('tu-chan-gioi', 2, {
        id: 'admin-id',
        role: 'ADMIN',
      });

      expect(result.isUnlocked).toBe(true);
      expect(result.content).toBe(fullContent);
    });

    it('should return full content if user has already unlocked the chapter', async () => {
      prisma.novel.findUnique.mockResolvedValue(sampleNovel);
      prisma.chapter.findUnique.mockResolvedValue({
        id: 'chap-2',
        novelId: 'novel-1',
        chapterNumber: 2,
        title: 'Chương 2: Bí Kíp',
        content: fullContent,
        views: 20,
        isVip: true,
        price: 5,
      });
      prisma.unlockedChapter.findUnique.mockResolvedValue({
        id: 'unlock-1',
        userId: 'user-1',
        chapterId: 'chap-2',
        coinsSpent: 5,
      });
      prisma.chapter.update.mockResolvedValue({});
      prisma.novel.update.mockResolvedValue({});
      prisma.chapter.findFirst.mockResolvedValue(null);

      const result = await service.findByNovelSlugAndNumber('tu-chan-gioi', 2, {
        id: 'user-1',
        role: 'USER',
      });

      expect(result.isUnlocked).toBe(true);
      expect(result.content).toBe(fullContent);
    });
  });

  describe('Atomic Chapter Unlock ($transaction & row-lock)', () => {
    it('should throw NotFoundException if chapter does not exist', async () => {
      prisma.chapter.findUnique.mockResolvedValue(null);

      await expect(service.unlock('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return idempotent success if chapter was already unlocked', async () => {
      prisma.chapter.findUnique.mockResolvedValue({
        id: 'chap-vip',
        isVip: true,
        price: 5,
        title: 'Chương VIP',
        content: 'Full Content',
      });
      prisma.unlockedChapter.findUnique.mockResolvedValue({
        id: 'unlock-existing',
        userId: 'user-1',
        chapterId: 'chap-vip',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        coins: 50,
      });

      const result = await service.unlock('chap-vip', 'user-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('trước đó');
      expect(result.chapter.isUnlocked).toBe(true);
      expect(result.remainingCoins).toBe(50);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.unlockedChapter.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user has insufficient coins', async () => {
      prisma.chapter.findUnique.mockResolvedValue({
        id: 'chap-vip',
        isVip: true,
        price: 10,
        title: 'Chương VIP Cao Cấp',
        content: 'Full Content',
      });
      prisma.unlockedChapter.findUnique.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{ id: 'user-poor', coins: 2 }]);

      await expect(service.unlock('chap-vip', 'user-poor')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.unlockedChapter.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should atomically deduct coins and record unlock when balance is sufficient', async () => {
      prisma.chapter.findUnique.mockResolvedValue({
        id: 'chap-vip',
        isVip: true,
        price: 5,
        title: 'Chương VIP',
        content: 'Full VIP Content',
      });
      prisma.unlockedChapter.findUnique.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{ id: 'user-rich', coins: 20 }]);
      prisma.unlockedChapter.create.mockResolvedValue({
        id: 'new-unlock',
        userId: 'user-rich',
        chapterId: 'chap-vip',
        coinsSpent: 5,
      });
      prisma.user.update.mockResolvedValue({
        coins: 15,
      });

      const result = await service.unlock('chap-vip', 'user-rich');

      expect(result.success).toBe(true);
      expect(result.chapter.isUnlocked).toBe(true);
      expect(result.remainingCoins).toBe(15);
      expect(prisma.unlockedChapter.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-rich',
          chapterId: 'chap-vip',
          coinsSpent: 5,
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-rich' },
        data: { coins: { decrement: 5 } },
        select: { coins: true },
      });
    });
  });
});
