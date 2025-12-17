import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './entities/bookmark.entity';
import { AddBookmarkDto, RemoveBookmarkDto } from './dto/bookmark.dto';
import { ListBookmarksDto } from './dto/list-bookmarks.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
  ) {}

  async addBookmark(user: User, dto: AddBookmarkDto) {
    const exists = await this.bookmarkRepository.findOne({
      where: { user: { id: user.id }, type: dto.type, itemId: dto.itemId },
    });
    if (exists) return exists;
    const bookmark = this.bookmarkRepository.create({ user, ...dto });
    return this.bookmarkRepository.save(bookmark);
  }

  async removeBookmark(user: User, dto: RemoveBookmarkDto) {
    return this.bookmarkRepository.delete({ user: { id: user.id }, type: dto.type, itemId: dto.itemId });
  }

  async listBookmarks(user: User, query: ListBookmarksDto) {
    const { type, page = 1, limit = 10 } = query;
    const where: any = { user: { id: user.id } };
    if (type) where.type = type;
    const [items, total] = await this.bookmarkRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return {
      items,
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit),
    };
  }
}
