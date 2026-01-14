import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TermsOfServiceAcceptance } from './terms-of-service-acceptance.entity';

@Entity('terms_of_service')
export class TermsOfService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  version: string; // e.g., "1.0.0", "2026-01-15 Q1 Update"

  @Column({ type: 'text' })
  content: string; // The full HTML or Markdown content

  @Column({ default: false })
  isActive: boolean; // Is this the version shown to users?

  @Column({ default: false })
  isMandatory: boolean; // Must users accept this version to use the app?

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => TermsOfServiceAcceptance,
    (acceptance) => acceptance.termsOfService,
  )
  acceptances: TermsOfServiceAcceptance[];
}