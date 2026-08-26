import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../upload/storage.service';
import { CreateNovelDto } from './dto/create-novel.dto';
import { UpdateNovelDto } from './dto/update-novel.dto';
import { QueryNovelDto } from './dto/query-novel.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class NovelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(createNovelDto: CreateNovelDto, file?: Express.Multer.File) {
    let slug = generateSlug(createNovelDto.title);

    // Check trùng slug
    const existing = await this.prisma.novel.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let coverUrl: string | undefined = undefined;
    if (file) {
      coverUrl = await this.storageService.uploadFile(file, 'covers');
    }

    const { categoryIds, ...novelData } = createNovelDto;

    const novel = await this.prisma.novel.create({
      data: {
        ...novelData,
        slug,
        coverUrl,
        categories:
          categoryIds && categoryIds.length > 0
            ? {
                create: categoryIds.map((categoryId) => ({
                  category: { connect: { id: categoryId } },
                })),
              }
            : undefined,
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    return novel;
  }

  async findAll(query: QueryNovelDto) {
    const {
      search,
      categoryId,
      categorySlug,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.NovelWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categorySlug) {
      where.categories = {
        some: {
          category: {
            slug: categorySlug,
          },
        },
      };
    } else if (categoryId) {
      where.categories = {
        some: { categoryId },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.novel.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          categories: {
            include: { category: true },
          },
          _count: {
            select: { chapters: true },
          },
        },
      }),
      this.prisma.novel.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneBySlug(slug: string) {
    const novel = await this.prisma.novel.findUnique({
      where: { slug },
      include: {
        categories: {
          include: { category: true },
        },
        chapters: {
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            views: true,
            isVip: true,
            price: true,
            createdAt: true,
          },
          orderBy: { chapterNumber: 'asc' },
        },
      },
    });

    if (!novel) {
      throw new NotFoundException(`Không tìm thấy truyện với slug: ${slug}`);
    }

    return novel;
  }

  async update(
    id: string,
    updateNovelDto: UpdateNovelDto,
    file?: Express.Multer.File,
  ) {
    const novel = await this.prisma.novel.findUnique({ where: { id } });
    if (!novel) {
      throw new NotFoundException(`Không tìm thấy truyện với ID: ${id}`);
    }

    let coverUrl = novel.coverUrl;
    if (file) {
      coverUrl = await this.storageService.uploadFile(file, 'covers');
    }

    const { categoryIds, title, ...updateData } = updateNovelDto;

    let newSlug = novel.slug;
    if (title && title !== novel.title) {
      newSlug = generateSlug(title);
      const existing = await this.prisma.novel.findFirst({
        where: { slug: newSlug, NOT: { id } },
      });
      if (existing) {
        newSlug = `${newSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // Nếu có truyền categoryIds, xóa liên kết cũ và thêm mới
    if (categoryIds) {
      await this.prisma.novelCategory.deleteMany({
        where: { novelId: id },
      });
    }

    const updated = await this.prisma.novel.update({
      where: { id },
      data: {
        ...updateData,
        title: title ?? novel.title,
        slug: newSlug,
        coverUrl,
        categories: categoryIds
          ? {
              create: categoryIds.map((catId) => ({
                category: { connect: { id: catId } },
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    return updated;
  }

  async remove(id: string) {
    const novel = await this.prisma.novel.findUnique({ where: { id } });
    if (!novel) {
      throw new NotFoundException(`Không tìm thấy truyện với ID: ${id}`);
    }

    await this.prisma.novel.delete({ where: { id } });
    return { message: 'Xóa truyện thành công', id };
  }
}
