import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type BookmarkType = 'content' | 'reciter' | 'tafsir';

@Entity()
export class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.bookmarks, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: ['content', 'reciter', 'tafsir'] })
  type: BookmarkType;

  @Column()
  itemId: string;

  @CreateDateColumn()
  createdAt: Date;
}
