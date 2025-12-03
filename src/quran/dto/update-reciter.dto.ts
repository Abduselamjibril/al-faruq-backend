// src/quran/dto/update-reciter.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateReciterDto } from './create-reciter.dto';

export class UpdateReciterDto extends PartialType(CreateReciterDto) {}