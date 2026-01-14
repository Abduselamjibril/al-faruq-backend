// src/users/entities/user.entity.ts

import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Purchase } from '../../purchase/entities/purchase.entity';
import { Role } from '../../roles/entities/role.entity';
import { Device } from '../../devices/entities/device.entity';
import { UserNotificationStatus } from '../../notifications/entities/user-notification-status.entity';
import { UserSession } from '../../auth/entities/user-session.entity';
import { Bookmark } from '../../bookmark/entities/bookmark.entity';
import { Content } from '../../content/entities/content.entity';
import { TermsOfServiceAcceptance } from '../../terms-of-service/entities/terms-of-service-acceptance.entity';

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password: string | null;

  @Expose()
  get hasPassword(): boolean {
    return !!this.password;
  }


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

  @ManyToMany(() => Role, (role) => role.users, {
    eager: true,
    cascade: true,
  })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => Purchase, (purchase) => purchase.user)
  purchases: Purchase[];

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];

  @OneToMany(() => UserSession, (session) => session.user)
  userSessions: UserSession[];

  @OneToMany(() => UserNotificationStatus, (status) => status.user)
  notificationStatuses: UserNotificationStatus[];

  @OneToMany(() => Bookmark, (bookmark: Bookmark) => bookmark.user)
  bookmarks: Bookmark[];

  @OneToMany(() => Content, (content) => content.createdBy)
  createdContent: Content[];
  @OneToMany(
    () => TermsOfServiceAcceptance,
    (acceptance) => acceptance.user,
  )
  tosAcceptances: TermsOfServiceAcceptance[];
}