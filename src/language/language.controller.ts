import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { LanguageService } from './language.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Language } from '../content/entities/language.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';
import { Public } from '../auth/decorators/public.decorator'; // Import Public decorator

@ApiTags('Language Management (Admin)')
@Controller('languages')
export class LanguageController {
  constructor(
    private readonly languageService: LanguageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.LANGUAGE_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN: Create a new language' })
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languageService.create(createLanguageDto);
  }

  // --- Endpoint with Caching ---
  // Note: This endpoint is now public to allow general access for caching.
  // The admin-specific guards have been removed from this specific GET route.
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all available languages' })
  @ApiResponse({ status: 200, description: 'A list of all languages.', type: [Language] })
  async findAll(): Promise<Language[]> {
    const cacheKey = 'all_languages';
    
    const cachedData = await this.cacheManager.get<Language[]>(cacheKey);
    if (cachedData) {
      console.log(`--- SUCCESS: Serving all languages from CACHE! ---`);
      return cachedData;
    }

    console.log(`--- INFO: Languages not in cache. Fetching from database... ---`);
    const dbData = await this.languageService.findAll();
    
    // Cache languages for 24 hours (86400 seconds)
    await this.cacheManager.set(cacheKey, dbData, 86400);

    return dbData;
  }

  // --- Other Admin Endpoints (Unchanged) ---

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.LANGUAGE_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN: Get a single language by its ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.languageService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.LANGUAGE_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN: Update an existing language' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ) {
    return this.languageService.update(id, updateLanguageDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.LANGUAGE_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN: Delete a language' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.languageService.remove(id);
  }
}