// src/database/seed.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, RoleName } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  ReminderSetting,
  ReminderId,
} from '../reminders/entities/reminder-setting.entity'; // <-- 1. IMPORT Reminder entities

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ReminderSetting) // <-- 2. INJECT ReminderSetting repository
    private readonly reminderSettingRepository: Repository<ReminderSetting>,
    private readonly configService: ConfigService,
  ) {}

  async seedDatabase() {
    this.logger.log('Starting database seeding process...');

    await this.seedRoles();
    await this.seedAdminUser();
    await this.seedReminderSettings(); // <-- 3. CALL the new seeder method

    this.logger.log('Database seeding finished.');
  }

  // --- NEW SEEDER METHOD FOR REMINDERS ---
  private async seedReminderSettings() {
    const remindersToSeed: Partial<ReminderSetting>[] = [
      {
        id: ReminderId.JUMUAH,
        isEnabled: false,
        message: "Don't forget to read Surah Al-Kahf. Jumu'ah Mubarak!",
        time: '12:00',
        dayOfWeek: 5, // Friday
        timeZone: 'Africa/Addis_Ababa',
      },
      {
        id: ReminderId.KHAMIS,
        isEnabled: false,
        message:
          'The Messenger of Allah (ﷺ) said: "The best of your days is Friday. So send a great deal of salah upon me on that day, for your salah will be presented to me."',
        time: '18:30',
        dayOfWeek: 4, // Thursday
        timeZone: 'Africa/Addis_Ababa',
      },
    ];

    for (const reminderData of remindersToSeed) {
      const reminderExists = await this.reminderSettingRepository.findOneBy({
        id: reminderData.id,
      });

      if (!reminderExists) {
        const newReminder = this.reminderSettingRepository.create(reminderData);
        await this.reminderSettingRepository.save(newReminder);
        this.logger.log(`Reminder setting '${reminderData.id}' created.`);
      } else {
        this.logger.log(`Reminder setting '${reminderData.id}' already exists.`);
      }
    }
  }
  // --- END OF NEW METHOD ---

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
      this.logger.error(
        'ADMIN_EMAIL or ADMIN_PASSWORD not found in .env file. Skipping admin user seed.',
      );
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
      this.logger.error(
        'ADMIN role not found. Cannot create admin user. Make sure roles are seeded first.',
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = this.userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '0000000000',
      agreedToTerms: true,
      role: adminRole,
    });

    await this.userRepository.save(adminUser);
    this.logger.log('Admin user created successfully.');
  }
}