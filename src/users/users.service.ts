// src/users/users.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return (await this.usersRepository.findOne({ where: { email } })) ?? undefined;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    return (
      (await this.usersRepository.findOne({ where: { phoneNumber } })) ??
      undefined
    );
  }

  async findById(id: number): Promise<User | undefined> {
    return (await this.usersRepository.findOne({ where: { id } })) ?? undefined;
  }

  // --- NEW METHOD FOR SSO ---
  async findByProviderId(
    provider: 'google' | 'facebook',
    providerId: string,
  ): Promise<User | undefined> {
    let whereCondition: any = {};
    if (provider === 'google') {
      whereCondition = { googleId: providerId };
    } else if (provider === 'facebook') {
      whereCondition = { facebookId: providerId };
    } else {
      return undefined; // Or throw an error for unsupported providers
    }
    return (await this.usersRepository.findOne({ where: whereCondition })) ?? undefined;
  }
  // --- END OF NEW METHOD ---


  async findByLoginIdentifier(identifier: string): Promise<User | undefined> {
    const isEmail = identifier.includes('@');
    if (isEmail) {
      return this.findByEmail(identifier);
    }
    return this.findByPhoneNumber(identifier);
  }

  async update(id: number, attrs: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, attrs);
    return this.usersRepository.save(user);
  }
}