// src/users/entities/user.entity.ts

import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Purchase } from '../../purchase/entities/purchase.entity';
import { Role } from '../../roles/entities/role.entity';
import { Device } from '../../devices/entities/device.entity'; // <-- 1. IMPORT Device entity

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password: string | null;

  @Column({ default: false })
  agreedToTerms: boolean;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ type: 'varchar', unique: true, nullable: true })
  googleId: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  facebookId: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  otp: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  otpExpiresAt: Date | null;

  @ManyToOne(() => Role, (role) => role.users, { eager: true, cascade: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @OneToMany(() => Purchase, (purchase) => purchase.user)
  purchases: Purchase[];
  
  // --- NEW DEVICE RELATIONSHIP ADDED BELOW ---
  @OneToMany(() => Device, (device) => device.user) // <-- 2. DEFINE the one-to-many relationship
  devices: Device[];
}