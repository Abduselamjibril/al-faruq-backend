// src/devices/devices.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

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

  async deleteDevice(fcmToken: string, userId: string): Promise<void> {
    this.logger.log(`Deleting FCM Token for user ID: ${userId}`);
    await this.deviceRepository.delete({ fcmToken, user: { id: userId } });
  }

  async findTokensByUserId(userId: string): Promise<string[]> {
    const devices = await this.deviceRepository.find({
      where: { user: { id: userId } },
    });
    return devices.map((device) => device.fcmToken);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.deviceRepository.count({
      where: { user: { id: userId } },
    });
  }

  async findAllTokens(): Promise<string[]> {
    const devices = await this.deviceRepository.find();
    return devices.map((device) => device.fcmToken);
  }

  async deleteTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    this.logger.log(`Cleaning up ${tokens.length} stale FCM tokens.`);
    await this.deviceRepository.delete({ fcmToken: In(tokens) });
  }
}