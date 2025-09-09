import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Content } from '../../content/entities/content.entity';

// This defines the structure of the JSON object in the additionalTiers column
export class AdditionalTier {
  days: number;
  price: number;
}

@Entity()
export class PricingTier extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'integer', default: 15 })
  baseDurationDays: number;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  additionalTiers: AdditionalTier[];

  @OneToOne(() => Content, (content) => content.pricingTier, {
    onDelete: 'CASCADE', // If the content is deleted, delete this pricing tier too.
  })
  @JoinColumn()
  content: Content;
}