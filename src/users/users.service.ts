// src/users/users.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// --- FIX: Import ILike for case-insensitive queries ---
import { ILike, Repository } from 'typeorm';
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

  // --- UPDATED: This method now performs a case-insensitive search ---
  async findByEmail(email: string): Promise<User | undefined> {
    // Using ILike ensures the query is case-insensitive at the database level.
    // e.g., 'John.Doe@Example.com' will match a record of 'john.doe@example.com'
    return (
      (await this.usersRepository.findOne({ where: { email: ILike(email) } })) ??
      undefined
    );
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
    return (
      (await this.usersRepository.findOne({ where: whereCondition })) ??
      undefined
    );
  }

  // --- UPDATED: This method now normalizes the email before searching ---
  async findByLoginIdentifier(identifier: string): Promise<User | undefined> {
    const isEmail = identifier.includes('@');
    if (isEmail) {
      // We still normalize the identifier here for consistency, even though
      // findByEmail is now case-insensitive. This is a robust pattern.
      return this.findByEmail(identifier.toLowerCase());
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