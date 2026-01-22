// src/admin/dto/create-role.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ArrayNotEmpty } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The unique name for the new role. Use uppercase and underscores (e.g., NEWS_EDITOR).',
    example: 'NEWS_EDITOR',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  name: string;

  @ApiProperty({
    description: 'List of permissions to assign to the role. Must be existing permissions.',
    example: ['CREATE_NEWS', 'EDIT_NEWS'],
    required: true,
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Trim()
  @Escape()
  permissions: string[];
}