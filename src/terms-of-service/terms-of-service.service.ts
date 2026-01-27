import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermsOfService } from './entities/terms-of-service.entity';
import { TermsOfServiceAcceptance } from './entities/terms-of-service-acceptance.entity';
import { CreateTermsOfServiceDto } from './dto/create-terms-of-service.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TermsOfServiceService {
  constructor(
    @InjectRepository(TermsOfService)
    private readonly tosRepository: Repository<TermsOfService>,
    @InjectRepository(TermsOfServiceAcceptance)
    private readonly acceptanceRepository: Repository<TermsOfServiceAcceptance>,
  ) {}

  /**
   * For Admins: Create a new ToS version.
   */
  async create(createDto: CreateTermsOfServiceDto): Promise<TermsOfService> {
    const newTos = this.tosRepository.create(createDto);
    return this.tosRepository.save(newTos);
  }

  /**
   * For Admins: Get all ToS versions, newest first.
   */
  async findAll(): Promise<TermsOfService[]> {
    return this.tosRepository.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * For App/Guards: Get the currently active and mandatory ToS.
   */
  async findActiveMandatory(): Promise<TermsOfService | null> {
    return this.tosRepository.findOne({
      where: { isActive: true, isMandatory: true },
    });
  }

  /**
   * Checks if a user has accepted a specific ToS version.
   */
  async hasUserAccepted(userId: string, tosId: string): Promise<boolean> {
    const count = await this.acceptanceRepository.count({
      where: {
        user: { id: userId },
        termsOfService: { id: tosId },
      },
    });
    return count > 0;
  }

  /**
   * Checks if the user has accepted the latest mandatory terms of service.
   */
  async hasAcceptedLatest(userId: string): Promise<boolean> {
    const mandatoryTos = await this.findActiveMandatory();
    if (!mandatoryTos) {
      return true; // No mandatory ToS, so nothing to accept.
    }
    return this.hasUserAccepted(userId, mandatoryTos.id);
  }

  /**
   * For Users: Accept a specific ToS version.
   */
  async accept(userId: string, tosId: string): Promise<void> {
    const hasAccepted = await this.hasUserAccepted(userId, tosId);
    if (hasAccepted) {
      return; // User has already accepted this version, do nothing.
    }

    const acceptance = this.acceptanceRepository.create({
      user: { id: userId },
      termsOfService: { id: tosId },
    });

    await this.acceptanceRepository.save(acceptance);
  }

  /**
   * For Admins: Activate a specific ToS version and deactivate all others.
   */
  async activate(id: string): Promise<TermsOfService> {
    const tosToActivate = await this.tosRepository.findOneBy({ id });
    if (!tosToActivate) {
      throw new NotFoundException(`Terms of Service with ID ${id} not found`);
    }

    // Use a transaction to ensure atomicity.
    await this.tosRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Deactivate all other ToS
        await transactionalEntityManager.update(
          TermsOfService,
          { isActive: true },
          { isActive: false },
        );

        // Activate the target ToS
        tosToActivate.isActive = true;
        await transactionalEntityManager.save(tosToActivate);
      },
    );

    // Refetch the entity to return its fully updated state.
    return (await this.tosRepository.findOneBy({ id }))!;
  }

  /**
   * For Admins: Make a specific ToS version mandatory and un-set all others.
   */
  async makeMandatory(id: string): Promise<TermsOfService> {
    const tosToMakeMandatory = await this.tosRepository.findOneBy({ id });
    if (!tosToMakeMandatory) {
      throw new NotFoundException(`Terms of Service with ID ${id} not found`);
    }

    await this.tosRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Set all other mandatory ToS to be non-mandatory
        await transactionalEntityManager.update(
          TermsOfService,
          { isMandatory: true },
          { isMandatory: false },
        );

        // Make the target ToS mandatory
        tosToMakeMandatory.isMandatory = true;
        await transactionalEntityManager.save(tosToMakeMandatory);
      },
    );

    // Refetch the entity to return its fully updated state. The '!' non-null
    // assertion is safe because we've already confirmed the entity exists.
    return (await this.tosRepository.findOneBy({ id }))!;
  }
}