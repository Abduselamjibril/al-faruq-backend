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
} from '@nestjs/swagger';

@ApiTags('Content Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @ApiOperation({ summary: 'Create a new content item (movie, series, etc.)' })
  @ApiResponse({ status: 201, description: 'Content successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 404, description: 'Parent content not found if parentId is provided.' })
  @Post()
  create(@Body() createContentDto: CreateContentDto) {
    return this.contentService.create(createContentDto);
  }

  @ApiOperation({ summary: 'Get all top-level content items' })
  @ApiResponse({ status: 200, description: 'Returns a list of movies, series, and music videos.' })
  @Get()
  findAllTopLevel() {
    return this.contentService.findAllTopLevel();
  }

  @ApiOperation({ summary: 'Get a single content item with its full hierarchy' })
  @ApiResponse({ status: 200, description: 'Returns the content item with its children (seasons/episodes).' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Get(':id')
  findOneWithHierarchy(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOneWithHierarchy(id);
  }

  @ApiOperation({ summary: 'Update a content item' })
  @ApiResponse({ status: 200, description: 'Content successfully updated.' })
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
  @ApiResponse({ status: 201, description: 'Content successfully locked and pricing set.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Post(':id/lock')
  lockContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createPricingDto: CreatePricingDto,
  ) {
    return this.contentService.lockContent(id, createPricingDto);
  }

  @ApiOperation({ summary: 'Unlock a content item' })
  @ApiResponse({ status: 201, description: 'Content successfully unlocked.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Post(':id/unlock')
  unlockContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.unlockContent(id);
  }
}