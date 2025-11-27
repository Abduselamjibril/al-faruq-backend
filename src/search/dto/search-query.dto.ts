import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SearchType {
  ALL = 'all',
  YOUTUBE = 'youtube',
  MOVIE = 'movie',
  EPISODE = 'episode',
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'The search term provided by the user. Must be at least 2 characters long.',
    example: 'heist',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  query: string;

  @ApiProperty({
    description: `The type of content to search for. 
- \`all\`: Searches across YouTube, Movies/Series, and Episodes.
- \`youtube\`: Searches only YouTube.
- \`movie\`: Searches only for local Movies, Series, and Music Videos.
- \`episode\`: Searches only for local Episodes.`,
    enum: SearchType,
    default: SearchType.ALL,
    example: 'all',
  })
  @IsEnum(SearchType)
  type: SearchType;
}