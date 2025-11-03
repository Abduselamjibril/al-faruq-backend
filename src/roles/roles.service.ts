// src/roles/roles.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleName } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findByName(name: RoleName): Promise<Role | undefined> {
    return (await this.rolesRepository.findOne({ where: { name } })) ?? undefined;
  }
}