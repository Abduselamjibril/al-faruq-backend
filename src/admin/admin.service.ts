// src/admin/admin.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role, RoleName } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  // --- Role Management ---
  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findOneBy({ name: createRoleDto.name });
    if (existingRole) {
      throw new ConflictException(`Role '${createRoleDto.name}' already exists.`);
    }

    // Find permissions by name
    const permissions = await this.permissionRepository.find({
      where: { name: In(createRoleDto.permissions) },
    });

    if (permissions.length !== createRoleDto.permissions.length) {
      throw new NotFoundException('One or more permissions do not exist.');
    }

    const role = this.roleRepository.create({
      name: createRoleDto.name,
      permissions,
    });
    return this.roleRepository.save(role);
  }

  findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<Role> {
    const role = await this.roleRepository.findOneBy({ id: roleId });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('One or more permissions not found.');
    }

    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  // --- Permission Management ---
  findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  // --- User-Role Management ---
  async assignRolesToUser(userId: string, roleIds: number[]): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['roles'] });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const roles = await this.roleRepository.findBy({ id: In(roleIds) });
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles not found.');
    }

    user.roles = roles;
    return this.userRepository.save(user);
  }
}