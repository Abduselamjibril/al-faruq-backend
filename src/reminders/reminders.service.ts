// src/reminders/reminders.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob } from 'cron';
import {
  ReminderSetting,
  ReminderId,
} from './entities/reminder-setting.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(ReminderSetting)
    private readonly reminderSettingRepository: Repository<ReminderSetting>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationsService: NotificationsService,
  ) {}

  // This lifecycle hook runs once the module has been initialized.
  async onModuleInit() {
    this.logger.log('Initializing scheduled reminders...');
    const settings = await this.findAll();
    for (const setting of settings) {
      if (setting.isEnabled) {
        this.scheduleReminder(setting);
      }
    }
  }

  findAll(): Promise<ReminderSetting[]> {
    return this.reminderSettingRepository.find();
  }

  findOne(id: ReminderId): Promise<ReminderSetting | null> {
    return this.reminderSettingRepository.findOneBy({ id });
  }

  async update(
    id: ReminderId,
    updateDto: Partial<ReminderSetting>,
  ): Promise<ReminderSetting> {
    const setting = await this.reminderSettingRepository.preload({
      id,
      ...updateDto,
    });
    if (!setting) {
      throw new Error(`Reminder setting with ID ${id} not found.`);
    }

    // Update the running cron job
    this.updateScheduledReminder(setting);

    return this.reminderSettingRepository.save(setting);
  }

  private scheduleReminder(setting: ReminderSetting): void {
    const [hour, minute] = setting.time.split(':');
    const cronTime = `${minute} ${hour} * * ${setting.dayOfWeek}`;

    const job = new CronJob(
      cronTime,
      () => {
        this.logger.log(`Executing reminder: ${setting.id}`);
        // The title is hardcoded for now, but could be a field in the entity
        const title =
          setting.id === ReminderId.JUMUAH
            ? "Jumu'ah Reminder"
            : 'Khamis Salawat Reminder';
        this.notificationsService.sendBroadcastNotification(
          title,
          setting.message,
        );
      },
      null,
      true,
      setting.timeZone,
    );

    this.schedulerRegistry.addCronJob(setting.id, job);
    this.logger.log(
      `Scheduled reminder "${setting.id}" with cron time "${cronTime}" in timezone "${setting.timeZone}"`,
    );
  }

  private updateScheduledReminder(setting: ReminderSetting): void {
    // Stop the existing job if it exists
    try {
      const existingJob = this.schedulerRegistry.getCronJob(setting.id);
      existingJob.stop();
      this.schedulerRegistry.deleteCronJob(setting.id);
      this.logger.log(`Stopped existing cron job for reminder: ${setting.id}`);
    } catch (error) {
      // It's okay if the job doesn't exist, means it wasn't running
      this.logger.log(
        `No existing cron job found for reminder "${setting.id}". A new one will be scheduled if enabled.`,
      );
    }

    // If the reminder is enabled, schedule a new job with the updated settings
    if (setting.isEnabled) {
      this.scheduleReminder(setting);
    }
  }
}