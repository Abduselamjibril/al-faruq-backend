// src/language/language.controller.ts

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
} from '@nestjs/common';
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import { Language } from '../content/entities/language.entity';

@ApiTags('Language Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new language' })
  @ApiBody({
    description: 'Data for creating a new language.',
    type: CreateLanguageDto,
  })
  @ApiResponse({
    status: 201,
    description: 'The language has been successfully created.',
    type: Language,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 409,
    description: 'A language with this name or code already exists.',
  })
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languageService.create(createLanguageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all available languages' })
  @ApiResponse({
    status: 200,
    description: 'A list of all languages.',
    type: [Language],
  })
  findAll() {
    return this.languageService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single language by its ID' })
  @ApiResponse({
    status: 200,
    description: 'Details of the language.',
    type: Language,
  })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.languageService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing language' })
  @ApiBody({
    description: 'Data for updating a language. All fields are optional.',
    type: UpdateLanguageDto,
  })
  @ApiResponse({
    status: 200,
    description: 'The language has been successfully updated.',
    type: Language,
  })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  @ApiResponse({
    status: 409,
    description: 'Another language with this name or code already exists.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ) {
    return this.languageService.update(id, updateLanguageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a language' })
  @ApiResponse({
    status: 200,
    description: 'The language has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.languageService.remove(id);
  }
}