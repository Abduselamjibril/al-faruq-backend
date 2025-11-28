// src/language/dto/update-language.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateLanguageDto } from './create-language.dto';

export class UpdateLanguageDto extends PartialType(CreateLanguageDto) {}