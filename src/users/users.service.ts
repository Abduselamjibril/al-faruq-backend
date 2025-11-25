import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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

  async findByEmail(email: string): Promise<User | undefined> {
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
      return undefined;
    }
    return (
      (await this.usersRepository.findOne({ where: whereCondition })) ??
      undefined
    );
  }

  async findByLoginIdentifier(identifier: string): Promise<User | undefined> {
    const isEmail = identifier.includes('@');
    if (isEmail) {
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

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  // --- NEW METHOD FOR SEARCHING USERS ---
  async search(term: string): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        // The search term will be matched against these four fields
        { firstName: ILike(`%${term}%`) },
        { lastName: ILike(`%${term}%`) },
        { email: ILike(`%${term}%`) },
        { phoneNumber: ILike(`%${term}%`) },
      ],
      order: {
        id: 'ASC',
      },
    });
  }
}