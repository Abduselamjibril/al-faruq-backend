// src/admin/dto/assign-permissions-to-role.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class AssignPermissionsToRoleDto {
  @ApiProperty({
    description: 'An array of permission IDs to assign to the role.',
    example: [1, 2, 5],
  })
  @IsArray()
  @IsInt({ each: true })
  permissionIds: number[];
}