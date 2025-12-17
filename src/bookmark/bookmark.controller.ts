import { Controller, Post, Delete, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../roles/entities/role.entity';
import { BookmarkService } from './bookmark.service';
import { AddBookmarkDto, RemoveBookmarkDto } from './dto/bookmark.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListBookmarksDto } from './dto/list-bookmarks.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}


  @Post()
  @Roles(RoleName.USER)
  addBookmark(@Request() req, @Body() dto: AddBookmarkDto) {
    return this.bookmarkService.addBookmark(req.user, dto);
  }


  @Delete()
  @Roles(RoleName.USER)
  removeBookmark(@Request() req, @Body() dto: RemoveBookmarkDto) {
    return this.bookmarkService.removeBookmark(req.user, dto);
  }


  @Get()
  @Roles(RoleName.USER)
  listBookmarks(@Request() req, @Query() query: ListBookmarksDto) {
    return this.bookmarkService.listBookmarks(req.user, query);
  }
}
