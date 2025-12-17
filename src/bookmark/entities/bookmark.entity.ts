
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContentType } from '../../content/entities/content.entity';

export type BookmarkType = ContentType | 'reciter' | 'tafsir';

@Entity()
export class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.bookmarks, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: [
      ...Object.values(ContentType),
      'reciter',
      'tafsir',
    ],
  })
  type: BookmarkType;

  @Column()
  itemId: string;

  @CreateDateColumn()
  createdAt: Date;
}
