import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark])],
  providers: [BookmarkService],
  controllers: [BookmarkController],
  exports: [BookmarkService],
})
export class BookmarkModule {}
