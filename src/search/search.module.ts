import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { YoutubeModule } from '../youtube/youtube.module';
import { ContentModule } from '../content/content.module';

@Module({
  imports: [
    // Import the modules that contain the services we need to use.
    YoutubeModule,
    ContentModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}