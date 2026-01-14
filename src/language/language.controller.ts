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
  Inject, // --- [NEW] ---
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'; // --- [NEW] ---
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

@ApiTags('Language Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.LANGUAGE_MANAGE)
@Controller('languages')
export class LanguageController {
  constructor(
    private readonly languageService: LanguageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache, // --- [NEW] ---
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new language' })
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languageService.create(createLanguageDto);
  }

  // --- Endpoint with Caching ---
  @Get()
  @ApiOperation({ summary: 'Get all available languages' })
  @ApiResponse({ status: 200, description: 'A list of all languages.', type: [Language] })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  async findAll() { // --- [MODIFIED] Must be async ---
    // --- [NEW CACHING LOGIC] ---
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
    // --- [END OF NEW CACHING LOGIC] ---
  }

  // --- Other Admin Endpoints (Unchanged) ---

  @Get(':id')
  @ApiOperation({ summary: 'Get a single language by its ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.languageService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing language' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ) {
    return this.languageService.update(id, updateLanguageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a language' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.languageService.remove(id);
  }
}