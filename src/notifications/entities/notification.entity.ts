// src/notifications/entities/notification.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserNotificationStatus } from './user-notification-status.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
  
  // --- NEW USER STATUS RELATIONSHIP ADDED BELOW ---
  @OneToMany(
    () => UserNotificationStatus,
    (status) => status.notification,
  )
  userStatuses: UserNotificationStatus[];
}