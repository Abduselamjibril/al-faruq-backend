import { Exclude, Expose } from 'class-transformer'; // 🟢 ADDED Expose
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
import { Device } from '../../devices/entities/device.entity';
import { UserNotificationStatus } from '../../notifications/entities/user-notification-status.entity';
import { UserSession } from '../../auth/entities/user-session.entity';

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

  @Column({ type: 'varchar', unique: true, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password: string | null;

  // 🟢 NEW VIRTUAL PROPERTY
  @Expose()
  get hasPassword(): boolean {
    return !!this.password;
  }

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


  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];

  @OneToMany(() => UserSession, (session) => session.user)
  userSessions: UserSession[];

  // --- NEW NOTIFICATION STATUS RELATIONSHIP ADDED BELOW ---
  @OneToMany(
    () => UserNotificationStatus,
    (status) => status.user,
  )
  notificationStatuses: UserNotificationStatus[];
}