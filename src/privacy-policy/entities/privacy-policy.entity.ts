// src/privacy-policy/entities/privacy-policy.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserPrivacyPolicyAcceptance } from './user-privacy-policy-acceptance.entity';

@Entity('privacy_policies')
export class PrivacyPolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'document_url', type: 'varchar', length: 2048 })
  documentUrl: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ name: 'is_mandatory', default: false })
  isMandatory: boolean;

  @Column({ name: 'effective_date', type: 'timestamp' })
  effectiveDate: Date;

  @ManyToOne(() => User, { nullable: false, eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => UserPrivacyPolicyAcceptance,
    (acceptance) => acceptance.privacyPolicy,
  )
  acceptances: UserPrivacyPolicyAcceptance[];
}