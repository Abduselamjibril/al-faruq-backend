// src/devices/entities/device.entity.ts

import { User } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Unique(['fcmToken']) // Ensures a token cannot be stored more than once
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fcmToken: string;

  @ManyToOne(() => User, (user) => user.devices, {
    onDelete: 'CASCADE', // If a user is deleted, their devices are also deleted
    nullable: false,
  })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}