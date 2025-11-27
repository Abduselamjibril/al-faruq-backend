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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';

@ApiTags('Search (User-Facing)')
@ApiBearerAuth()
@Controller('search')
// --- GUARDS AND ROLES APPLIED AT THE CONTROLLER LEVEL ---
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.USER)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Perform a unified search across all content sources (User Only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a combined list of search results based on the query type.',
    type: SearchResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data for query or type.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  search(@Query() searchQueryDto: SearchQueryDto) {
    return this.searchService.performSearch(
      searchQueryDto.query,
      searchQueryDto.type,
    );
  }
}