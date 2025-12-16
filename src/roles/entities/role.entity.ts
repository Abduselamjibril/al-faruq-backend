// src/roles/entities/role.entity.ts

import { User } from '../../users/entities/user.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';


export enum RoleName {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: RoleName, unique: true, default: RoleName.USER })
  name: RoleName;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}