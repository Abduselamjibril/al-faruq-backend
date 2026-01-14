// src/admin/dto/assign-roles-to-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class AssignRolesToUserDto {
  @ApiProperty({
    description: 'An array of role IDs to assign to the user.',
    example: [2, 3],
  })
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}