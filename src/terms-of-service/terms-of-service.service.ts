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

  // For Admins: Create a new ToS version
  async create(createDto: CreateTermsOfServiceDto): Promise<TermsOfService> {
    const newTos = this.tosRepository.create(createDto);
    return this.tosRepository.save(newTos);
  }

  // For Admins: Get all ToS versions
  async findAll(): Promise<TermsOfService[]> {
    return this.tosRepository.find({ order: { createdAt: 'DESC' } });
  }

  // For App/Guards: Get the currently active and mandatory ToS
  async findActiveMandatory(): Promise<TermsOfService | null> {
    return this.tosRepository.findOne({
      where: { isActive: true, isMandatory: true },
    });
  }

  // For Users: Accept a specific ToS version
  async accept(userId: string, tosId: string): Promise<void> {
    const hasAccepted = await this.hasUserAccepted(userId, tosId);
    if (hasAccepted) {
      return; // User has already accepted this version
    }

    const acceptance = this.acceptanceRepository.create({
      user: { id: userId },
      termsOfService: { id: tosId },
    });

    await this.acceptanceRepository.save(acceptance);
  }

  // For Guards/Logic: Check if a user has accepted a specific ToS version
  async hasUserAccepted(userId: string, tosId: string): Promise<boolean> {
    const count = await this.acceptanceRepository.count({
      where: {
        user: { id: userId },
        termsOfService: { id: tosId },
      },
    });
    return count > 0;
  }

  // For Admins: Activate a specific ToS version (and deactivate others)
  async activate(id: string): Promise<TermsOfService> {
    const tosToActivate = await this.tosRepository.findOneBy({ id });
    if (!tosToActivate) {
      throw new NotFoundException(`Terms of Service with ID ${id} not found`);
    }

    // This logic ensures only one version is active at a time.
    await this.tosRepository.update({ isActive: true }, { isActive: false });

    tosToActivate.isActive = true;
    return this.tosRepository.save(tosToActivate);
  }
async makeMandatory(id: string): Promise<TermsOfService> {
    const tosToMakeMandatory = await this.tosRepository.findOneBy({ id });
    if (!tosToMakeMandatory) {
      throw new NotFoundException(`Terms of Service with ID ${id} not found`);
    }

    await this.tosRepository.manager.transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.update(
            TermsOfService, 
            { isMandatory: true },
            { isMandatory: false }
        );
        
        tosToMakeMandatory.isMandatory = true;
        await transactionalEntityManager.save(tosToMakeMandatory);
    });

    // We refetch the entity. We use '!' to assert that it's not null,
    // because we know it exists.
    return (await this.tosRepository.findOneBy({ id }))!; // <-- THE FIX
  }
}