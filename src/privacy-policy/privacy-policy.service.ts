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

  /**
   * Creates a new privacy policy version, uploads its document,
   * and handles setting it as active/mandatory atomically.
   * @param createDto - DTO with policy details.
   * @param file - The PDF document file.
   * @param adminId - The ID of the admin user creating the policy.
   * @returns The newly created PrivacyPolicy entity.
   */
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

  /**
   * Retrieves all privacy policies, intended for an admin view.
   * @returns A list of all PrivacyPolicy entities, sorted by version descending.
   */
  async findAllForAdmin(): Promise<PrivacyPolicy[]> {
    return this.privacyPolicyRepository.find({
      order: {
        version: 'DESC',
      },
    });
  }

  /**
   * Sets a specific policy's `isActive` status. Ensures only one can be active at a time.
   * @param policyId - The ID of the policy to update.
   * @param isActive - The new activation status.
   * @returns The updated PrivacyPolicy entity.
   */
  async updateActivationStatus(
    policyId: number,
    isActive: boolean,
  ): Promise<PrivacyPolicy> {
    return this._updatePolicyStatus(policyId, 'isActive', isActive);
  }

  /**
   * Sets a specific policy's `isMandatory` status. Ensures only one can be mandatory at a time.
   * @param policyId - The ID of the policy to update.
   * @param isMandatory - The new mandatory status.
   * @returns The updated PrivacyPolicy entity.
   */
  async updateMandatoryStatus(
    policyId: number,
    isMandatory: boolean,
  ): Promise<PrivacyPolicy> {
    return this._updatePolicyStatus(policyId, 'isMandatory', isMandatory);
  }

  /**
   * Retrieves a paginated list of users who have accepted a specific policy.
   * @param policyId - The ID of the policy.
   * @param paginationDto - DTO for pagination parameters (page, limit).
   * @returns A paginated response of user acceptances.
   */
  async getAcceptancesForPolicy(
    policyId: number,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginationResponseDto<UserPrivacyPolicyAcceptance>> {
    await this._findPolicyById(policyId); // Ensures policy exists

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

  /**
   * Records a user's acceptance of the current mandatory privacy policy.
   * @param userId - The ID of the accepting user.
   * @param acceptDto - DTO containing device information.
   * @param ipAddress - The IP address from which the acceptance was made.
   * @returns The newly created UserPrivacyPolicyAcceptance entity.
   */
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

  /**
   * Finds the single policy that is both active and mandatory.
   * @returns The current mandatory PrivacyPolicy entity or null if none exists.
   */
  async getCurrentMandatoryPolicy(): Promise<PrivacyPolicy | null> {
    return this.privacyPolicyRepository.findOne({
      where: {
        isActive: true,
        isMandatory: true,
      },
    });
  }

  /**
   * Checks if a specific user has accepted a specific policy version.
   * @param userId - The ID of the user.
   * @param policyId - The ID of the policy.
   * @returns A boolean indicating if the user has accepted.
   */
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
  
  /**
   * Checks if the user has accepted the latest mandatory privacy policy.
   * @param userId - The ID of the user to check.
   * @returns `true` if the user has accepted, or if no mandatory policy exists. `false` otherwise.
   */
  async hasAcceptedLatest(userId: string): Promise<boolean> {
    const mandatoryPolicy = await this.getCurrentMandatoryPolicy();
    if (!mandatoryPolicy) {
      return true; // No mandatory policy, so nothing to accept
    }
    return this.hasUserAcceptedPolicy(userId, mandatoryPolicy.id);
  }

  /**
   * Determines if a user needs to accept the current mandatory policy.
   * @param userId - The ID of the user.
   * @returns `true` if there is a mandatory policy they have not accepted, `false` otherwise.
   */
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

  /**
   * Retrieves the current publicly active policy for display purposes.
   * @returns The active PrivacyPolicy entity.
   */
  async getPubliclyActivePolicy(): Promise<PrivacyPolicy> {
    const activePolicy = await this.privacyPolicyRepository.findOne({
      where: { isActive: true },
    });
    if (!activePolicy) {
      throw new NotFoundException('No active privacy policy found.');
    }
    return activePolicy;
  }

  /**
   * Finds a policy by its ID or throws a NotFoundException.
   * @param policyId - The ID of the policy to find.
   * @returns The PrivacyPolicy entity.
   */
  private async _findPolicyById(policyId: number): Promise<PrivacyPolicy> {
    const policy = await this.privacyPolicyRepository.findOneBy({ id: policyId });
    if (!policy) {
      throw new NotFoundException(`Privacy Policy with ID ${policyId} not found.`);
    }
    return policy;
  }

  /**
   * A generic helper to update a policy's status field (`isActive` or `isMandatory`).
   * Uses a transaction to ensure that if a new policy is being set to `true`,
   * all other policies have that same field set to `false`.
   * @param policyId - The ID of the policy to update.
   * @param statusField - The name of the field to update ('isActive' or 'isMandatory').
   * @param value - The new boolean value for the field.
   * @returns The updated PrivacyPolicy entity.
   */
  private async _updatePolicyStatus(
    policyId: number,
    statusField: 'isActive' | 'isMandatory',
    value: boolean,
  ): Promise<PrivacyPolicy> {
    const policy = await this._findPolicyById(policyId);
    if (policy[statusField] === value) {
      return policy; // No change needed
    }

    try {
      return await this.privacyPolicyRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // If setting to true, first set all others to false for this field
          if (value === true) {
            await transactionalEntityManager.update(
              PrivacyPolicy,
              { [statusField]: true },
              { [statusField]: false },
            );
          }
          // Now update the target policy
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