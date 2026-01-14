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
} from '../reminders/entities/reminder-setting.entity';
import { Permission } from '../permissions/entities/permission.entity';

// Define the comprehensive permission list
export const PERMISSIONS = {
  // User & Role Management
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage', // Replaces ROLE_ASSIGN for clarity
  // General Content Management
  CONTENT_UPLOAD: 'content.upload',
  CONTENT_EDIT_OWN: 'content.edit.own',
  CONTENT_VIEW_OWN: 'content.view.own',
  CONTENT_MANAGE_ALL: 'content.manage.all', // For moderators/admins to view/edit all content
  CONTENT_APPROVE: 'content.approve',
  CONTENT_REJECT: 'content.reject',
  CONTENT_DELETE: 'content.delete',
  PRICING_MANAGE: 'pricing.manage', // For locking/unlocking content
  // Module-specific Management
  QURAN_MANAGE: 'quran.manage',
  NEWS_MANAGE: 'news.manage',
  LANGUAGE_MANAGE: 'language.manage',
  POLICY_MANAGE: 'policy.manage',
  UPLOAD_MEDIA: 'upload.media',
  // System & Reports
  SETTINGS_MANAGE: 'settings.manage', // For reminders, broadcast notifications etc.
  REPORTS_VIEW: 'reports.view',
};

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(ReminderSetting)
    private readonly reminderSettingRepository: Repository<ReminderSetting>,
    private readonly configService: ConfigService,
  ) {}

  async seedDatabase() {
    this.logger.log('Starting database seeding process...');
    await this.seedPermissions();
    await this.seedRolesAndPermissions();
    await this.seedAdminUser();
    await this.seedReminderSettings();
    this.logger.log('Database seeding finished.');
  }

  private async seedPermissions() {
    this.logger.log('Seeding permissions...');
    const allPermissions = [
      { name: PERMISSIONS.USER_MANAGE, description: 'Manage users (view, search, delete)' },
      { name: PERMISSIONS.ROLE_MANAGE, description: 'Manage roles and assign them to users' },
      { name: PERMISSIONS.CONTENT_UPLOAD, description: 'Upload new content' },
      { name: PERMISSIONS.CONTENT_EDIT_OWN, description: 'Edit own uploaded content' },
      { name: PERMISSIONS.CONTENT_VIEW_OWN, description: 'View own uploaded content' },
      { name: PERMISSIONS.CONTENT_MANAGE_ALL, description: 'View and edit all content from any user' },
      { name: PERMISSIONS.CONTENT_APPROVE, description: 'Approve or publish content for public view' },
      { name: PERMISSIONS.CONTENT_REJECT, description: 'Reject content submitted for review' },
      { name: PERMISSIONS.CONTENT_DELETE, description: 'Delete any content from the system' },
      { name: PERMISSIONS.PRICING_MANAGE, description: 'Set pricing, lock, and unlock content' },
      { name: PERMISSIONS.QURAN_MANAGE, description: 'Manage Quran reciters and tafsirs' },
      { name: PERMISSIONS.NEWS_MANAGE, description: 'Manage news articles' },
      { name: PERMISSIONS.LANGUAGE_MANAGE, description: 'Manage languages' },
      { name: PERMISSIONS.POLICY_MANAGE, description: 'Manage privacy policies' },
      { name: PERMISSIONS.UPLOAD_MEDIA, description: 'Upload media files (video, audio, images, PDFs)' },
      { name: PERMISSIONS.SETTINGS_MANAGE, description: 'Manage system settings (e.g., reminders, notifications)' },
      { name: PERMISSIONS.REPORTS_VIEW, description: 'View financial and system reports' },
    ];

    for (const p of allPermissions) {
      const permissionExists = await this.permissionRepository.findOneBy({ name: p.name });
      if (!permissionExists) {
        const newPermission = this.permissionRepository.create(p);
        await this.permissionRepository.save(newPermission);
        this.logger.log(`Permission '${p.name}' created.`);
      }
    }
  }

  private async seedRolesAndPermissions() {
    this.logger.log('Seeding roles and assigning permissions...');
    const allPermissions = await this.permissionRepository.find();
    const findPermission = (name: string) => allPermissions.find((p) => p.name === name)!;

    const rolesWithPermissions = [
      {
        name: RoleName.ADMIN,
        permissions: Object.values(PERMISSIONS), // Admin gets all permissions
      },
      {
        name: RoleName.MODERATOR,
        permissions: [
            PERMISSIONS.CONTENT_MANAGE_ALL,
            PERMISSIONS.CONTENT_APPROVE,
            PERMISSIONS.CONTENT_REJECT
        ],
      },
      {
        name: RoleName.UPLOADER,
        permissions: [
            PERMISSIONS.CONTENT_UPLOAD,
            PERMISSIONS.CONTENT_EDIT_OWN,
            PERMISSIONS.CONTENT_VIEW_OWN,
            PERMISSIONS.UPLOAD_MEDIA
        ],
      },
      { name: RoleName.USER, permissions: [] },
      { name: RoleName.GUEST, permissions: [] },
    ];

    for (const roleData of rolesWithPermissions) {
      let role = await this.roleRepository.findOne({ where: { name: roleData.name }, relations: ['permissions'] });

      if (!role) {
        role = this.roleRepository.create({ name: roleData.name });
        this.logger.log(`Role '${roleData.name}' created.`);
      }

      role.permissions = roleData.permissions.map(name => findPermission(name));
      await this.roleRepository.save(role);
      this.logger.log(`Assigned ${role.permissions.length} permissions to role '${roleData.name}'.`);
    }
  }
  
  private async seedAdminUser() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.error('ADMIN_EMAIL or ADMIN_PASSWORD not found. Skipping admin user seed.');
      return;
    }

    const adminExists = await this.userRepository.findOne({ where: { email: adminEmail } });
    if (adminExists) {
      this.logger.log('Admin user already exists.');
      return;
    }

    const adminRole = await this.roleRepository.findOne({ where: { name: RoleName.ADMIN } });
    if (!adminRole) {
      this.logger.error('ADMIN role not found. Cannot create admin user.');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = this.userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '0000000000',
      roles: [adminRole],
    });

    await this.userRepository.save(adminUser);
    this.logger.log('Admin user created successfully.');
  }

  private async seedReminderSettings() {
    const remindersToSeed: Partial<ReminderSetting>[] = [
      {
        id: ReminderId.JUMUAH,
        isEnabled: false,
        message: "Don't forget to read Surah Al-Kahf. Jumu'ah Mubarak!",
        time: '12:00',
        dayOfWeek: 5,
        timeZone: 'Africa/Addis_Ababa',
      },
      {
        id: ReminderId.KHAMIS,
        isEnabled: false,
        message: 'The Messenger of Allah (ﷺ) said: "The best of your days is Friday. So send a great deal of salah upon me on that day, for your salah will be presented to me."',
        time: '18:30',
        dayOfWeek: 4,
        timeZone: 'Africa/Addis_Ababa',
      },
    ];

    for (const reminderData of remindersToSeed) {
      const reminderExists = await this.reminderSettingRepository.findOneBy({ id: reminderData.id });
      if (!reminderExists) {
        const newReminder = this.reminderSettingRepository.create(reminderData);
        await this.reminderSettingRepository.save(newReminder);
        this.logger.log(`Reminder setting '${reminderData.id}' created.`);
      }
    }
  }
}