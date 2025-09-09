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
  // UsePipes, // No longer needed here
  // ValidationPipe, // No longer needed here
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { CreatePricingDto } from './dto/create-pricing.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * Creates a new content item.
   * This method now relies on the GLOBAL ValidationPipe in main.ts.
   */
  @Post()
  create(@Body() createContentDto: CreateContentDto) {
    // For debugging, we can log the received data AFTER validation and transformation
    console.log('Received data in create controller:', createContentDto);
    console.log('Type of duration:', typeof createContentDto.duration); // Should be 'number'
    return this.contentService.create(createContentDto);
  }

  /**
   * Retrieves a list of all top-level content.
   */
  @Get()
  findAllTopLevel() {
    return this.contentService.findAllTopLevel();
  }

  /**
   * Retrieves a single content item with its full hierarchy.
   */
  @Get(':id')
  findOneWithHierarchy(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOneWithHierarchy(id);
  }

  /**
   * Updates a content item's metadata.
   * This method now relies on the GLOBAL ValidationPipe in main.ts.
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.contentService.update(id, updateContentDto);
  }

  /**
   * Deletes a content item.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }

  /**
   * Locks a movie or series and sets its pricing tiers.
   */
  @Post(':id/lock')
  lockContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createPricingDto: CreatePricingDto,
  ) {
    return this.contentService.lockContent(id, createPricingDto);
  }

  /**
   * Unlocks a movie or series.
   */
  @Post(':id/unlock')
  unlockContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.unlockContent(id);
  }
}