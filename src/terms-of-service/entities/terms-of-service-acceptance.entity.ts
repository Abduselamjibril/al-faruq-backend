import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TermsOfService } from './terms-of-service.entity';

@Entity('terms_of_service_acceptances')
@Index(['user', 'termsOfService'], { unique: true }) // A user can only accept a specific version once
export class TermsOfServiceAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.tosAcceptances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(
    () => TermsOfService,
    (termsOfService) => termsOfService.acceptances,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'termsOfServiceId' })
  termsOfService: TermsOfService;

  @CreateDateColumn()
  acceptedAt: Date;
}