import { Controller, Post, Delete, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { AddBookmarkDto, RemoveBookmarkDto } from './dto/bookmark.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListBookmarksDto } from './dto/list-bookmarks.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Post()
  addBookmark(@Request() req, @Body() dto: AddBookmarkDto) {
    return this.bookmarkService.addBookmark(req.user, dto);
  }

  @Delete()
  removeBookmark(@Request() req, @Body() dto: RemoveBookmarkDto) {
    return this.bookmarkService.removeBookmark(req.user, dto);
  }

  @Get()
  listBookmarks(@Request() req, @Query() query: ListBookmarksDto) {
    return this.bookmarkService.listBookmarks(req.user, query);
  }
}
