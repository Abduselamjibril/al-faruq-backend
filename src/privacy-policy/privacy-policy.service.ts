// src/privacy-policy/privacy-policy.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacyPolicy } from './entities/privacy-policy.entity';
import { UserPrivacyPolicyAcceptance } from './entities/user-privacy-policy-acceptance.entity';
import { CreatePrivacyPolicyDto } from './dto/create-privacy-policy.dto';
import { User } from '../users/entities/user.entity';
import { UploadService } from '../upload/upload.service';
import { UsersService } from '../users/users.service';
import type { Express } from 'express';
import { AcceptPrivacyPolicyDto } from './dto/accept-privacy-policy.dto';
import { PaginationQueryDto } from '../utils/pagination-query.dto';
import { PaginationResponseDto } from '../utils/pagination.dto';

@Injectable()
export class PrivacyPolicyService {
  private readonly logger = new Logger(PrivacyPolicyService.name);

  constructor(
    @InjectRepository(PrivacyPolicy)
    private readonly privacyPolicyRepository: Repository<PrivacyPolicy>,
    @InjectRepository(UserPrivacyPolicyAcceptance)
    private readonly acceptanceRepository: Repository<UserPrivacyPolicyAcceptance>,
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    createDto: CreatePrivacyPolicyDto,
    file: Express.Multer.File,
    adminId: string,
  ): Promise<PrivacyPolicy> {
    const existingVersion = await this.privacyPolicyRepository.findOneBy({
      version: createDto.version,
    });
    if (existingVersion) {
      throw new ConflictException(
        `A policy with version '${createDto.version}' already exists.`,
      );
    }

    const adminUser = await this.usersService.findById(adminId);
    if (!adminUser) {
      throw new NotFoundException(`Admin user with ID ${adminId} not found.`);
    }

    let documentUrl: string;
    try {
      const uploadResult = await this.uploadService.uploadFile(file, 'pdf');
      documentUrl = uploadResult.url;
    } catch (error) {
      this.logger.error('Failed to upload privacy policy PDF', error.stack);
      throw new InternalServerErrorException(
        'Could not upload the policy document.',
      );
    }

    try {
      return await this.privacyPolicyRepository.manager.transaction(
        async (transactionalEntityManager) => {
          if (createDto.isActive) {
            await transactionalEntityManager.update(
              PrivacyPolicy,
              { isActive: true },
              { isActive: false },
            );
          }
          if (createDto.isMandatory) {
            await transactionalEntityManager.update(
              PrivacyPolicy,
              { isMandatory: true },
              { isMandatory: false },
            );
          }

          const newPolicy = transactionalEntityManager.create(PrivacyPolicy, {
            ...createDto,
            documentUrl,
            createdBy: adminUser,
          });

          return await transactionalEntityManager.save(newPolicy);
        },
      );
    } catch (error) {
      this.logger.error('Failed to create privacy policy in transaction', error.stack);
      throw new InternalServerErrorException(
        'A database error occurred while creating the policy.',
      );
    }
  }

  async findAllForAdmin(): Promise<PrivacyPolicy[]> {
    return this.privacyPolicyRepository.find({
      order: {
        version: 'DESC',
      },
    });
  }

  async updateActivationStatus(
    policyId: number,
    isActive: boolean,
  ): Promise<PrivacyPolicy> {
    return this._updatePolicyStatus(policyId, 'isActive', isActive);
  }

  async updateMandatoryStatus(
    policyId: number,
    isMandatory: boolean,
  ): Promise<PrivacyPolicy> {
    return this._updatePolicyStatus(policyId, 'isMandatory', isMandatory);
  }

  async getAcceptancesForPolicy(
    policyId: number,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginationResponseDto<UserPrivacyPolicyAcceptance>> {
    await this._findPolicyById(policyId);

    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await this.acceptanceRepository.findAndCount({
      where: { privacyPolicy: { id: policyId } },
      relations: ['user'],
      take: limit,
      skip: skip,
      order: {
        acceptedAt: 'DESC',
      },
    });

    const totalPages = Math.ceil(totalItems / limit);

    return new PaginationResponseDto(data, {
      totalItems,
      itemCount: data.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    });
  }

  async recordAcceptance(
    userId: string,
    acceptDto: AcceptPrivacyPolicyDto,
    ipAddress: string,
  ): Promise<UserPrivacyPolicyAcceptance> {
    const mandatoryPolicy = await this.getCurrentMandatoryPolicy();
    if (!mandatoryPolicy) {
      throw new BadRequestException('There is no mandatory policy to accept at this time.');
    }

    const hasAlreadyAccepted = await this.hasUserAcceptedPolicy(userId, mandatoryPolicy.id);
    if (hasAlreadyAccepted) {
      throw new ConflictException('You have already accepted the current privacy policy.');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const acceptance = this.acceptanceRepository.create({
      user: user,
      privacyPolicy: mandatoryPolicy,
      policyVersion: mandatoryPolicy.version,
      acceptedIp: ipAddress,
      deviceInfo: acceptDto.deviceInfo,
    });

    return this.acceptanceRepository.save(acceptance);
  }

  async getCurrentMandatoryPolicy(): Promise<PrivacyPolicy | null> {
    return this.privacyPolicyRepository.findOne({
      where: {
        isActive: true,
        isMandatory: true,
      },
    });
  }

  async hasUserAcceptedPolicy(
    userId: string,
    policyId: number,
  ): Promise<boolean> {
    const count = await this.acceptanceRepository.count({
      where: {
        user: { id: userId },
        privacyPolicy: { id: policyId },
      },
    });
    return count > 0;
  }

  async checkIfAcceptanceIsRequired(userId: string): Promise<boolean> {
    const mandatoryPolicy = await this.getCurrentMandatoryPolicy();
    if (!mandatoryPolicy) {
      return false;
    }
    const hasAccepted = await this.hasUserAcceptedPolicy(
      userId,
      mandatoryPolicy.id,
    );
    return !hasAccepted;
  }

  async getPubliclyActivePolicy(): Promise<PrivacyPolicy> {
    const activePolicy = await this.privacyPolicyRepository.findOne({
      where: { isActive: true },
    });
    if (!activePolicy) {
      throw new NotFoundException('No active privacy policy found.');
    }
    return activePolicy;
  }

  private async _findPolicyById(policyId: number): Promise<PrivacyPolicy> {
    const policy = await this.privacyPolicyRepository.findOneBy({ id: policyId });
    if (!policy) {
      throw new NotFoundException(`Privacy Policy with ID ${policyId} not found.`);
    }
    return policy;
  }

  private async _updatePolicyStatus(
    policyId: number,
    statusField: 'isActive' | 'isMandatory',
    value: boolean,
  ): Promise<PrivacyPolicy> {
    const policy = await this._findPolicyById(policyId);
    if (policy[statusField] === value) {
      return policy;
    }
    try {
      return await this.privacyPolicyRepository.manager.transaction(
        async (transactionalEntityManager) => {
          if (value === true) {
            await transactionalEntityManager.update(
              PrivacyPolicy,
              { [statusField]: true },
              { [statusField]: false },
            );
          }
          policy[statusField] = value;
          return await transactionalEntityManager.save(policy);
        },
      );
    } catch (error) {
      this.logger.error(`Failed to update policy status for ID ${policyId}`, error.stack);
      throw new InternalServerErrorException(
        'A database error occurred while updating the policy status.',
      );
    }
  }
}