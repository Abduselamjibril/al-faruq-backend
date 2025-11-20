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
import { CreatePricingDto } from './dto/create-pricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody, // --- ADDED ---
} from '@nestjs/swagger';
import { Content } from './entities/content.entity'; // --- ADDED ---

@ApiTags('Content Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @ApiOperation({ summary: 'Create a new content item (movie, series, etc.)' })
  // --- ADDED ApiBody to show request example ---
  @ApiBody({ type: CreateContentDto })
  // --- UPDATED ApiResponse to show response example ---
  @ApiResponse({ status: 201, description: 'Content successfully created.', type: Content })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 404, description: 'Parent content not found if parentId is provided.' })
  @Post()
  create(@Body() createContentDto: CreateContentDto) {
    return this.contentService.create(createContentDto);
  }

  @ApiOperation({ summary: 'Get all top-level content items' })
  // --- UPDATED ApiResponse to show array response example ---
  @ApiResponse({ status: 200, description: 'Returns a list of movies, series, and music videos.', type: [Content] })
  @Get()
  findAllTopLevel() {
    return this.contentService.findAllTopLevel();
  }

  @ApiOperation({ summary: 'Get a single content item with its full hierarchy' })
  // --- UPDATED ApiResponse to show response example ---
  @ApiResponse({ status: 200, description: 'Returns the content item with its children (seasons/episodes).', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Get(':id')
  findOneWithHierarchy(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOneWithHierarchy(id);
  }

  @ApiOperation({ summary: 'Update a content item' })
  // --- ADDED ApiBody to show request example ---
  @ApiBody({ type: UpdateContentDto })
  // --- UPDATED ApiResponse to show response example ---
  @ApiResponse({ status: 200, description: 'Content successfully updated.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.contentService.update(id, updateContentDto);
  }

  @ApiOperation({ summary: 'Delete a content item and all its children' })
  @ApiResponse({ status: 204, description: 'Content successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }

  @ApiOperation({ summary: 'Lock a content item and set its pricing' })
  // --- ADDED ApiBody to show request example ---
  @ApiBody({ type: CreatePricingDto })
  // --- UPDATED ApiResponse to show response example ---
  @ApiResponse({ status: 201, description: 'Content successfully locked and pricing set.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Post(':id/lock')
  lockContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createPricingDto: CreatePricingDto,
  ) {
    return this.contentService.lockContent(id, createPricingDto);
  }

  @ApiOperation({ summary: 'Unlock a content item' })
  // --- UPDATED ApiResponse to show response example ---
  @ApiResponse({ status: 200, description: 'Content successfully unlocked.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  // --- UPDATED to use PATCH and 200 OK status for semantic correctness ---
  @Patch(':id/unlock')
  @HttpCode(HttpStatus.OK)
  unlockContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.unlockContent(id);
  }
}