// src/notifications/entities/notification.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
}