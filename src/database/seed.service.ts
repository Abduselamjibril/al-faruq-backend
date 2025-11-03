// src/database/seed.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, RoleName } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async seedDatabase() {
    this.logger.log('Starting database seeding process...');

    await this.seedRoles();
    await this.seedAdminUser();

    this.logger.log('Database seeding finished.');
  }

  private async seedRoles() {
    const rolesToSeed = [RoleName.ADMIN, RoleName.USER];
    for (const roleName of rolesToSeed) {
      const roleExists = await this.roleRepository.findOne({
        where: { name: roleName },
      });

      if (!roleExists) {
        const newRole = this.roleRepository.create({ name: roleName });
        await this.roleRepository.save(newRole);
        this.logger.log(`Role '${roleName}' created.`);
      } else {
        this.logger.log(`Role '${roleName}' already exists.`);
      }
    }
  }

  private async seedAdminUser() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.error('ADMIN_EMAIL or ADMIN_PASSWORD not found in .env file. Skipping admin user seed.');
      return;
    }

    const adminExists = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (adminExists) {
      this.logger.log('Admin user already exists.');
      return;
    }

    const adminRole = await this.roleRepository.findOne({
      where: { name: RoleName.ADMIN },
    });

    if (!adminRole) {
      this.logger.error("ADMIN role not found. Cannot create admin user. Make sure roles are seeded first.");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = this.userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '0000000000', // A placeholder phone number
      agreedToTerms: true,
      role: adminRole,
    });

    await this.userRepository.save(adminUser);
    this.logger.log('Admin user created successfully.');
  }
}