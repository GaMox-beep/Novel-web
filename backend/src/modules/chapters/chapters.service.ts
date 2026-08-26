import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

interface UserContext {
  id?: string;
  role?: string;
  coins?: number;
}

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChapterDto: CreateChapterDto) {
    const { novelId, chapterNumber, title, content, isVip, price } =
      createChapterDto;

    // Kiểm tra truyện có tồn tại không
    const novel = await this.prisma.novel.findUnique({
      where: { id: novelId },
    });
    if (!novel) {
      throw new NotFoundException(`Không tìm thấy truyện với ID: ${novelId}`);
    }

    // Kiểm tra trùng chapterNumber trong cùng 1 truyện
    const existingChapter = await this.prisma.chapter.findUnique({
      where: {
        novelId_chapterNumber: {
          novelId,
          chapterNumber,
        },
      },
    });

    if (existingChapter) {
      throw new ConflictException(`Truyện này đã có Chương ${chapterNumber}`);
    }

    const calculatedPrice = isVip ? (price !== undefined ? price : 5) : 0;

    const chapter = await this.prisma.chapter.create({
      data: {
        novelId,
        chapterNumber,
        title,
        content,
        isVip: isVip ?? false,
        price: calculatedPrice,
      },
    });

    // Cập nhật updatedAt của Novel
    await this.prisma.novel.update({
      where: { id: novelId },
      data: { updatedAt: new Date() },
    });

    return chapter;
  }

  private async incrementViews(chapterId: string, novelId: string) {
    await Promise.all([
      this.prisma.chapter.update({
        where: { id: chapterId },
        data: { views: { increment: 1 } },
      }),
      this.prisma.novel.update({
        where: { id: novelId },
        data: { views: { increment: 1 } },
      }),
    ]);
  }

  private async getChapterNavigation(novelId: string, chapterNumber: number) {
    const [prevChapter, nextChapter] = await Promise.all([
      this.prisma.chapter.findFirst({
        where: {
          novelId,
          chapterNumber: { lt: chapterNumber },
        },
        orderBy: { chapterNumber: 'desc' },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          isVip: true,
          price: true,
        },
      }),
      this.prisma.chapter.findFirst({
        where: {
          novelId,
          chapterNumber: { gt: chapterNumber },
        },
        orderBy: { chapterNumber: 'asc' },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          isVip: true,
          price: true,
        },
      }),
    ]);
    return { prevChapter, nextChapter };
  }

  private generatePreviewContent(fullContent: string): string {
    if (!fullContent) return '';
    const paragraphs = fullContent
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length <= 2) {
      const joined = paragraphs.join('\n\n');
      return joined.length > 300 ? joined.slice(0, 300) + '...' : joined;
    }

    return paragraphs.slice(0, 2).join('\n\n');
  }

  private async resolveChapterContent(
    chapter: {
      id: string;
      content: string;
      isVip: boolean;
      price: number;
    },
    user?: UserContext | null,
  ): Promise<{
    content: string;
    isUnlocked: boolean;
    isVip: boolean;
    price: number;
  }> {
    const isVip = chapter.isVip;
    const price = chapter.price || (isVip ? 5 : 0);

    // Free chapter
    if (!isVip || price <= 0) {
      return {
        content: chapter.content,
        isUnlocked: true,
        isVip: false,
        price: 0,
      };
    }

    // Admin role bypass
    if (user?.role === 'ADMIN') {
      return {
        content: chapter.content,
        isUnlocked: true,
        isVip: true,
        price,
      };
    }

    // Check if user has unlocked the chapter
    if (user?.id) {
      const unlockedRecord = await this.prisma.unlockedChapter.findUnique({
        where: {
          userId_chapterId: {
            userId: user.id,
            chapterId: chapter.id,
          },
        },
      });

      if (unlockedRecord) {
        return {
          content: chapter.content,
          isUnlocked: true,
          isVip: true,
          price,
        };
      }
    }

    // Locked chapter preview
    return {
      content: this.generatePreviewContent(chapter.content),
      isUnlocked: false,
      isVip: true,
      price,
    };
  }

  async findOne(id: string, user?: UserContext | null) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            slug: true,
            authorName: true,
            coverUrl: true,
          },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException(`Không tìm thấy chương với ID: ${id}`);
    }

    await this.incrementViews(id, chapter.novelId);
    const navigation = await this.getChapterNavigation(
      chapter.novelId,
      chapter.chapterNumber,
    );

    const resolved = await this.resolveChapterContent(chapter, user);

    return {
      ...chapter,
      content: resolved.content,
      isUnlocked: resolved.isUnlocked,
      isVip: resolved.isVip,
      price: resolved.price,
      views: chapter.views + 1,
      navigation,
    };
  }

  async findByNovelSlugAndNumber(
    slug: string,
    chapterNumber: number,
    user?: UserContext | null,
  ) {
    const novel = await this.prisma.novel.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        authorName: true,
        coverUrl: true,
      },
    });

    if (!novel) {
      throw new NotFoundException(`Không tìm thấy truyện với slug: ${slug}`);
    }

    const chapter = await this.prisma.chapter.findUnique({
      where: {
        novelId_chapterNumber: {
          novelId: novel.id,
          chapterNumber,
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException(
        `Không tìm thấy Chương ${chapterNumber} của truyện ${novel.title}`,
      );
    }

    await this.incrementViews(chapter.id, novel.id);
    const navigation = await this.getChapterNavigation(
      novel.id,
      chapter.chapterNumber,
    );

    const resolved = await this.resolveChapterContent(chapter, user);

    return {
      ...chapter,
      content: resolved.content,
      isUnlocked: resolved.isUnlocked,
      isVip: resolved.isVip,
      price: resolved.price,
      views: chapter.views + 1,
      novel,
      navigation,
    };
  }

  async unlock(chapterId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const chapter = await tx.chapter.findUnique({
        where: { id: chapterId },
        include: {
          novel: {
            select: {
              id: true,
              title: true,
              slug: true,
              authorName: true,
              coverUrl: true,
            },
          },
        },
      });

      if (!chapter) {
        throw new NotFoundException(
          `Không tìm thấy chương với ID: ${chapterId}`,
        );
      }

      const price = chapter.price || (chapter.isVip ? 5 : 0);

      // Nếu chương miễn phí, trả về trực tiếp nội dung đầy đủ
      if (!chapter.isVip || price <= 0) {
        return {
          success: true,
          message: 'Chương này hoàn toàn miễn phí',
          chapter: {
            ...chapter,
            isUnlocked: true,
          },
          remainingCoins: 0,
        };
      }

      // Kiểm tra idempotency: Nếu user đã mở khóa từ trước
      const existingUnlock = await tx.unlockedChapter.findUnique({
        where: {
          userId_chapterId: {
            userId,
            chapterId,
          },
        },
      });

      if (existingUnlock) {
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { coins: true },
        });

        return {
          success: true,
          message: 'Chương này đã được mở khóa trước đó',
          chapter: {
            ...chapter,
            isUnlocked: true,
          },
          remainingCoins: currentUser?.coins ?? 0,
        };
      }

      // Row-level lock on user row để tránh race condition khi double-click
      const users = await tx.$queryRaw<Array<{ id: string; coins: number }>>`
        SELECT id, coins FROM users WHERE id = ${userId} FOR UPDATE
      `;
      const user = users?.[0];

      if (!user || user.coins < price) {
        throw new BadRequestException(
          `Số dư xu không đủ để mở khóa chương này (Cần ${price} xu, hiện có ${user?.coins ?? 0} xu). Vui lòng nạp thêm.`,
        );
      }

      // Lưu bản ghi mở khóa chương
      await tx.unlockedChapter.create({
        data: {
          userId,
          chapterId,
          coinsSpent: price,
        },
      });

      // Trừ xu của user
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          coins: { decrement: price },
        },
        select: { coins: true },
      });

      return {
        success: true,
        message: 'Mở khóa chương thành công',
        chapter: {
          ...chapter,
          isUnlocked: true,
        },
        remainingCoins: updatedUser.coins,
      };
    });
  }

  async update(id: string, updateChapterDto: UpdateChapterDto) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) {
      throw new NotFoundException(`Không tìm thấy chương với ID: ${id}`);
    }

    if (
      updateChapterDto.chapterNumber &&
      updateChapterDto.chapterNumber !== chapter.chapterNumber
    ) {
      const existing = await this.prisma.chapter.findUnique({
        where: {
          novelId_chapterNumber: {
            novelId: chapter.novelId,
            chapterNumber: updateChapterDto.chapterNumber,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Truyện này đã có Chương ${updateChapterDto.chapterNumber}`,
        );
      }
    }

    const data: Partial<UpdateChapterDto> = { ...updateChapterDto };
    if (updateChapterDto.isVip === false) {
      data.price = 0;
    } else if (
      updateChapterDto.isVip === true &&
      updateChapterDto.price === undefined &&
      !chapter.price
    ) {
      data.price = 5;
    }

    return this.prisma.chapter.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) {
      throw new NotFoundException(`Không tìm thấy chương với ID: ${id}`);
    }

    await this.prisma.chapter.delete({ where: { id } });
    return { message: 'Xóa chương thành công', id };
  }
}
