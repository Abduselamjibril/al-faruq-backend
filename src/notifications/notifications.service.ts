// src/notifications/notifications.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { DevicesService } from '../devices/devices.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UserNotificationStatus } from './entities/user-notification-status.entity';
import { PaginationQueryDto } from '../utils/pagination-query.dto';
import {
  PaginationMetaDto,
  PaginationResponseDto,
} from '../utils/pagination.dto';

interface ContentPublishedPayload {
  contentId: string;
  title: string;
  thumbnailUrl?: string | null;
  deeplink: string;
  webUrl?: string;
  season?: number;
  episode?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserNotificationStatus)
    private readonly userNotificationStatusRepository: Repository<UserNotificationStatus>,
    private readonly devicesService: DevicesService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private formatEpisodeLabel(season?: number, episode?: number): string {
    if (!season || !episode) return '';
    const s = season.toString().padStart(2, '0');
    const e = episode.toString().padStart(2, '0');
    return `S${s} E${e}`;
  }

  private buildBody(title: string, season?: number, episode?: number): string {
    const ep = this.formatEpisodeLabel(season, episode);
    return ep ? `${title} — ${ep} is now live` : `${title} is now live`;
  }

  async getNotificationsForUser(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginationResponseDto<any>> {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect(
        'notification.userStatuses',
        'status',
        'status.userId = :userId',
        { userId },
      )
      .where('status.isCleared IS NULL OR status.isCleared = :isCleared', {
        isCleared: false,
      })
      .orderBy('notification.sentAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [paginatedNotifications, totalItems] =
      await queryBuilder.getManyAndCount();

    const data = paginatedNotifications.map((notification) => {
      const status = notification.userStatuses[0];
      return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        sentAt: notification.sentAt,
        isRead: status ? status.isRead : false,
      };
    });

    const meta = new PaginationMetaDto({
      itemCount: data.length,
      totalItems,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    });

    return new PaginationResponseDto(data, meta);
  }

  async markNotificationAsRead(
    userId: string,
    notificationId: number,
  ): Promise<void> {
    await this.userNotificationStatusRepository.save({
      userId,
      notificationId,
      isRead: true,
    });
    this.logger.log(
      `Marked notification ${notificationId} as read for user ${userId}`,
    );
  }

  async clearNotificationForUser(
    userId: string,
    notificationId: number,
  ): Promise<void> {
    await this.userNotificationStatusRepository.save({
      userId,
      notificationId,
      isRead: true,
      isCleared: true,
    });
    this.logger.log(
      `Cleared notification ${notificationId} for user ${userId}`,
    );
  }

  async clearAllNotificationsForUser(userId: string): Promise<void> {
    const allNotifications = await this.notificationRepository.find({
      select: ['id'],
    });

    if (allNotifications.length === 0) {
      return;
    }

    const statusesToUpsert = allNotifications.map((notification) => ({
      userId,
      notificationId: notification.id,
      isRead: true,
      isCleared: true,
    }));

    await this.userNotificationStatusRepository.save(statusesToUpsert);
    this.logger.log(`Cleared all notifications for user ${userId}`);
  }

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

  async sendContentPublishedNotification(
    payload: ContentPublishedPayload,
  ): Promise<void> {
    const tokens = await this.devicesService.findAllTokens();
    if (tokens.length === 0) {
      this.logger.warn('No device tokens found. Skipping content publish push.');
      return;
    }

    const body = this.buildBody(payload.title, payload.season, payload.episode);
    const title = 'New drop alert';

    const data: Record<string, string> = {
      contentId: payload.contentId,
      deeplink: payload.deeplink,
    };
    if (payload.webUrl) data.webUrl = payload.webUrl;
    if (payload.season) data.season = payload.season.toString();
    if (payload.episode) data.episode = payload.episode.toString();

    const tokenChunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 500) {
      tokenChunks.push(tokens.slice(i, i + 500));
    }

    let allStaleTokens: string[] = [];
    for (const chunk of tokenChunks) {
      const stale = await this.firebaseService.sendMulticastNotification(
        chunk,
        {
          title,
          body,
          image: payload.thumbnailUrl ?? undefined,
        },
        data,
      );
      if (stale.length) {
        allStaleTokens = allStaleTokens.concat(stale);
      }
    }

    if (allStaleTokens.length) {
      await this.devicesService.deleteTokens(allStaleTokens);
    }

    const newNotification = this.notificationRepository.create({
      title,
      message: body,
    });
    await this.notificationRepository.save(newNotification);
    this.logger.log(`Content publish push sent for content ${payload.contentId}`);
  }

  async getHistory(): Promise<Notification[]> {
    return this.notificationRepository.find({
      order: {
        sentAt: 'DESC',
      },
    });
  }

  async deleteNotification(id: number): Promise<void> {
    const result = await this.notificationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Notification with ID ${id} not found.`);
    }
    this.logger.log(`Deleted notification history item with ID: ${id}`);
  }
}