// src/privacy-policy/entities/user-privacy-policy-acceptance.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PrivacyPolicy } from './privacy-policy.entity';

@Entity('user_privacy_policy_acceptances')
@Unique(['user', 'privacyPolicy']) // A user can only accept a specific policy once
export class UserPrivacyPolicyAcceptance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => PrivacyPolicy, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  privacyPolicy: PrivacyPolicy;

  @Column({ name: 'policy_version', type: 'varchar', length: 50 })
  policyVersion: string; // Denormalized for historical tracking

  @CreateDateColumn({ name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ name: 'accepted_ip', type: 'varchar', length: 45, nullable: true })
  acceptedIp: string | null;

  @Column({ name: 'device_info', type: 'text', nullable: true })
  deviceInfo: string | null; // e.g., User-Agent string
}