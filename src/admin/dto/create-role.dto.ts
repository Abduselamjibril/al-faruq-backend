// src/admin/dto/create-role.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoleName } from '../../roles/entities/role.entity';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The unique name for the new role.',
    enum: RoleName,
    example: RoleName.MODERATOR,
  })
  @IsEnum(RoleName)
  name: RoleName;
}