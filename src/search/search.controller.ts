import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SearchResultDto } from './dto/search-result.dto';

@ApiTags('Search (User)')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({ summary: 'Perform a unified search across all content sources' })
  @ApiResponse({
    status: 200,
    description: 'Returns a combined list of search results based on the query type.',
    type: SearchResultDto, // --- THIS IS THE KEY CHANGE ---
  })
  @ApiResponse({ status: 400, description: 'Invalid input data for query or type.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. A valid JWT is required.' })
  @Get()
  search(@Query() searchQueryDto: SearchQueryDto) {
    return this.searchService.performSearch(
      searchQueryDto.query,
      searchQueryDto.type,
    );
  }
}