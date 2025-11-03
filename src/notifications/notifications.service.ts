// src/notifications/notifications.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { DevicesService } from '../devices/devices.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly devicesService: DevicesService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async sendBroadcastNotification(
    title: string,
    message: string,
  ): Promise<void> {
    this.logger.log(`Initiating broadcast notification: "${title}"`);

    const allTokens = await this.devicesService.findAllTokens();
    if (allTokens.length === 0) {
      this.logger.warn('No device tokens found. Aborting broadcast.');
      return;
    }

    const tokenChunks: string[][] = [];
    for (let i = 0; i < allTokens.length; i += 500) {
      tokenChunks.push(allTokens.slice(i, i + 500));
    }

    let allStaleTokens: string[] = [];

    for (const chunk of tokenChunks) {
      this.logger.log(
        `Sending broadcast to a chunk of ${chunk.length} tokens.`,
      );
      const staleTokensInChunk =
        await this.firebaseService.sendMulticastNotification(chunk, {
          title,
          body: message,
        });
      if (staleTokensInChunk.length > 0) {
        allStaleTokens = [...allStaleTokens, ...staleTokensInChunk];
      }
    }

    if (allStaleTokens.length > 0) {
      await this.devicesService.deleteTokens(allStaleTokens);
    }

    const newNotification = this.notificationRepository.create({
      title,
      message,
    });
    await this.notificationRepository.save(newNotification);

    this.logger.log('Broadcast notification process completed.');
  }

  async getHistory(): Promise<Notification[]> {
    return this.notificationRepository.find({
      order: {
        sentAt: 'DESC',
      },
    });
  }

  // --- NEW DELETE METHOD ---
  async deleteNotification(id: number): Promise<void> {
    const result = await this.notificationRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Notification with ID ${id} not found.`);
    }
    this.logger.log(`Deleted notification history item with ID: ${id}`);
  }
}