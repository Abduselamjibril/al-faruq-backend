import { ApiProperty } from '@nestjs/swagger';
import { Content } from '../../content/entities/content.entity';

/**
 * An example DTO representing a single YouTube search result for documentation.
 */
class YoutubeResultExampleDto {
  @ApiProperty({ example: 'dQw4w9WgXcQ' })
  videoId: string;

  @ApiProperty({ example: 'Rick Astley - Never Gonna Give You Up (Official Music Video)' })
  title: string;

  @ApiProperty({ example: 'The official video for “Never Gonna Give You Up” by Rick Astley...' })
  description: string;

  @ApiProperty({ example: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' })
  thumbnailUrl: string;

  @ApiProperty({ example: 'RickAstleyVEVO' })
  channelTitle: string;

  @ApiProperty({ example: '2009-10-25T06:57:33Z' })
  publishedAt: string;
}

/**
 * Defines the final structure of the search response body.
 */
export class SearchResultDto {
  @ApiProperty({
    description: 'A list of search results from YouTube.',
    type: [YoutubeResultExampleDto],
  })
  youtube: YoutubeResultExampleDto[];

  @ApiProperty({
    description: 'A list of matching top-level content (Movies, Series, Music Videos) from the local database.',
    type: [Content],
  })
  movies: Content[];

  @ApiProperty({
    description: 'A list of matching episodes from the local database.',
    type: [Content],
  })
  episodes: Content[];
}