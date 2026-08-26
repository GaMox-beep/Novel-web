import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { QueryBookmarkDto } from './dto/query-bookmark.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryBookmarkDto,
  ) {
    return this.bookmarksService.findAll(userId, query);
  }

  @Post(':novelId/toggle')
  @UseGuards(JwtAuthGuard)
  async toggle(
    @CurrentUser('id') userId: string,
    @Param('novelId') novelId: string,
  ) {
    return this.bookmarksService.toggle(userId, novelId);
  }

  @Get(':novelId/status')
  @UseGuards(OptionalJwtAuthGuard)
  async checkStatus(
    @CurrentUser('id') userId: string | undefined,
    @Param('novelId') novelId: string,
  ) {
    return this.bookmarksService.checkStatus(userId, novelId);
  }
}
