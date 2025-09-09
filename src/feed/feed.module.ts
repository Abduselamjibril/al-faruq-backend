import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { Content } from '../content/entities/content.entity';
import { Purchase } from '../purchase/entities/purchase.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Content, Purchase])],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}