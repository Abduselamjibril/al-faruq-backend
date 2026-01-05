// src/content/content.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { SetPricingDto } from './dto/set-pricing.dto'; // --- [CHANGED] Import new DTO ---
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Content } from './entities/content.entity';

@ApiTags('Content Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @ApiOperation({
    summary: 'Create a new content item (movie, series, book, etc.)',
  })
  @ApiBody({ type: CreateContentDto })
  @ApiResponse({
    status: 201,
    description: 'Content successfully created.',
    type: Content,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 404,
    description: 'Parent content not found if parentId is provided.',
  })
  @Post()
  create(@Body() createContentDto: CreateContentDto) {
    return this.contentService.create(createContentDto);
  }

  @ApiOperation({ summary: 'Get all top-level content items' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all top-level content.',
    type: [Content],
  })
  @Get()
  findAllTopLevel() {
    return this.contentService.findAllTopLevel();
  }

  @ApiOperation({ summary: 'Get a single content item with its full hierarchy' })
  @ApiResponse({
    status: 200,
    description:
      'Returns the content item with its children (e.g., seasons/episodes).',
    type: Content,
  })
  @ApiResponse({
    status: 404,
    description: 'Content with the specified ID not found.',
  })
  @Get(':id')
  findOneWithHierarchy(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOneWithHierarchy(id);
  }

  @ApiOperation({ summary: 'Update a content item' })
  @ApiBody({ type: UpdateContentDto })
  @ApiResponse({
    status: 200,
    description: 'Content successfully updated.',
    type: Content,
  })
  @ApiResponse({
    status: 404,
    description: 'Content with the specified ID not found.',
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.contentService.update(id, updateContentDto);
  }

  @ApiOperation({ summary: 'Delete a content item and all its children' })
  @ApiResponse({ status: 200, description: 'Content successfully deleted.' })
  @ApiResponse({
    status: 404,
    description: 'Content with the specified ID not found.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }

  // --- [REFACTORED] lockContent is now set-pricing ---
  @ApiOperation({ summary: 'Set the price for a single content item' })
  @ApiBody({ type: SetPricingDto })
  @ApiResponse({
    status: 201,
    description: 'Content successfully marked as locked and pricing set.',
    type: Content,
  })
  @ApiResponse({
    status: 404,
    description: 'Content with the specified ID not found.',
  })
  @Post(':id/set-pricing')
  setPricing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() setPricingDto: SetPricingDto,
  ) {
    return this.contentService.setPricing(id, setPricingDto);
  }

  // --- [REMOVED] The unlockContent endpoint is now obsolete. ---
}