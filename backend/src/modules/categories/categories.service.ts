import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { novels: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { novels: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy thể loại với ID: ${id}`);
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name.trim();
    const slug = createCategoryDto.slug
      ? generateSlug(createCategoryDto.slug)
      : generateSlug(name);

    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }],
      },
    });

    if (existing) {
      if (existing.name.toLowerCase() === name.toLowerCase()) {
        throw new ConflictException(`Thể loại với tên "${name}" đã tồn tại`);
      }
      throw new ConflictException(`Slug "${slug}" đã được sử dụng`);
    }

    return this.prisma.category.create({
      data: {
        name,
        slug,
        description: createCategoryDto.description?.trim() || null,
      },
      include: {
        _count: {
          select: { novels: true },
        },
      },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy thể loại với ID: ${id}`);
    }

    const name = updateCategoryDto.name?.trim();
    let slug = updateCategoryDto.slug
      ? generateSlug(updateCategoryDto.slug)
      : undefined;
    if (!slug && name && name !== category.name) {
      slug = generateSlug(name);
    }

    if (name || slug) {
      const conflict = await this.prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(name
              ? [{ name: { equals: name, mode: 'insensitive' as const } }]
              : []),
            ...(slug ? [{ slug }] : []),
          ],
        },
      });

      if (conflict) {
        if (name && conflict.name.toLowerCase() === name.toLowerCase()) {
          throw new ConflictException(`Thể loại với tên "${name}" đã tồn tại`);
        }
        if (slug && conflict.slug === slug) {
          throw new ConflictException(`Slug "${slug}" đã được sử dụng`);
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(updateCategoryDto.description !== undefined
          ? { description: updateCategoryDto.description?.trim() || null }
          : {}),
      },
      include: {
        _count: {
          select: { novels: true },
        },
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy thể loại với ID: ${id}`);
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Xóa thể loại thành công', id };
  }
}
