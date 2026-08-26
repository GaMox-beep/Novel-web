import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { NovelsService } from './novels.service';
import { CreateNovelDto } from './dto/create-novel.dto';
import { UpdateNovelDto } from './dto/update-novel.dto';
import { QueryNovelDto } from './dto/query-novel.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('novels')
export class NovelsController {
  constructor(private readonly novelsService: NovelsService) {}

  @Get()
  async findAll(@Query() query: QueryNovelDto) {
    return this.novelsService.findAll(query);
  }

  @Get(':slug')
  async findOneBySlug(@Param('slug') slug: string) {
    return this.novelsService.findOneBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AUTHOR)
  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  async create(
    @Body() createNovelDto: CreateNovelDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.novelsService.create(createNovelDto, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AUTHOR)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('cover'))
  async update(
    @Param('id') id: string,
    @Body() updateNovelDto: UpdateNovelDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.novelsService.update(id, updateNovelDto, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.novelsService.remove(id);
  }
}
