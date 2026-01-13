// src/notifications/entities/user-notification-status.entity.ts

import { User } from '../../users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Notification } from './notification.entity';

@Entity('user_notification_statuses')
export class UserNotificationStatus {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'notification_id' })
  notificationId: number;

  @ManyToOne(() => User, (user) => user.notificationStatuses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(
    () => Notification,
    (notification) => notification.userStatuses,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isCleared: boolean;
}