// src/devices/devices.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm'; // <-- 1. IMPORT 'In' from typeorm
import { Device } from './entities/device.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  /**
   * Registers a device for a user.
   * If the token already exists, it updates the associated user.
   * If it doesn't exist, it creates a new record.
   */
  async registerDevice(fcmToken: string, user: User): Promise<Device> {
    const existingDevice = await this.deviceRepository.findOne({
      where: { fcmToken },
    });

    if (existingDevice) {
      this.logger.log(
        `FCM Token already exists. Updating user to ID: ${user.id}`,
      );
      existingDevice.user = user;
      return this.deviceRepository.save(existingDevice);
    } else {
      this.logger.log(`Registering new FCM Token for user ID: ${user.id}`);
      const newDevice = this.deviceRepository.create({
        fcmToken,
        user,
      });
      return this.deviceRepository.save(newDevice);
    }
  }

  /**
   * Deletes a device token record for a specific user.
   * This is used when a user logs out.
   */
  async deleteDevice(fcmToken: string, userId: number): Promise<void> {
    this.logger.log(`Deleting FCM Token for user ID: ${userId}`);
    await this.deviceRepository.delete({ fcmToken, user: { id: userId } });
  }

  /**
   * Finds all device tokens for a given user ID.
   */
  async findTokensByUserId(userId: number): Promise<string[]> {
    const devices = await this.deviceRepository.find({
      where: { user: { id: userId } },
    });
    return devices.map((device) => device.fcmToken);
  }

  /**
   * Finds all device tokens for all users.
   */
  async findAllTokens(): Promise<string[]> {
    const devices = await this.deviceRepository.find();
    return devices.map((device) => device.fcmToken);
  }

  /**
   * Deletes a list of tokens from the database.
   * This is used for cleaning up stale tokens after an FCM send operation.
   */
  async deleteTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    this.logger.log(`Cleaning up ${tokens.length} stale FCM tokens.`);
    await this.deviceRepository.delete({ fcmToken: In(tokens) }); // <-- 'In' is now correctly imported
  }
}