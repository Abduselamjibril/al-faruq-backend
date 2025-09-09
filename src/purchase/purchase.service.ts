import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { randomBytes } from 'crypto';
import { AxiosResponse } from 'axios'; // <-- Import AxiosResponse

import { Purchase } from './entities/purchase.entity';
import { Content } from '../content/entities/content.entity';
import { User } from '../users/entities/user.entity';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';

// --- NEW: Define an interface for the Chapa response shape ---
interface ChapaTransactionResponse {
  message: string;
  status: string;
  data: {
    checkout_url?: string; // For initialization
    // Add other potential fields from verification response if needed
    amount?: number; 
  };
}

@Injectable()
export class PurchaseService {
  private readonly chapaSecretKey: string;

  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.chapaSecretKey = this.configService.get<string>('CHAPA_SECRET_KEY')!;
    if (!this.chapaSecretKey) {
      throw new Error('CHAPA_SECRET_KEY is not defined in environment variables');
    }
  }

  async initiatePurchase(
    userId: number,
    initiatePurchaseDto: InitiatePurchaseDto,
  ) {
    const { contentId, durationDays } = initiatePurchaseDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const content = await this.contentRepository.findOne({
      where: { id: contentId },
      relations: ['pricingTier'],
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }
    if (!content.isLocked || !content.pricingTier) {
      throw new BadRequestException('This content is not available for purchase.');
    }

    const price = this.calculatePrice(content.pricingTier, durationDays);
    if (price <= 0) {
      throw new BadRequestException('Invalid duration or price calculation.');
    }

    const tx_ref = `alfaruq-${userId}-${contentId}-${randomBytes(8).toString('hex')}`;

    const chapaRequestBody = {
      amount: price.toString(),
      currency: 'ETB',
      // --- FIX: Provide fallback for potentially null user properties ---
      email: user.email || '', 
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      tx_ref: tx_ref,
      callback_url: `https://YOUR_API_DOMAIN/purchase/chapa-webhook`,
      return_url: `https://YOUR_FLUTTER_APP_DEEPLINK/purchase-success`,
      'customization[title]': 'Al-Faruq Content Purchase',
      'customization[description]': `Payment for ${content.title}`,
    };

    try {
      // --- FIX: Type the expected response from the HTTP call ---
      const response = await firstValueFrom(
        this.httpService.post<ChapaTransactionResponse>(
          'https://api.chapa.co/v1/transaction/initialize',
          chapaRequestBody,
          {
            headers: { Authorization: `Bearer ${this.chapaSecretKey}` },
          },
        ),
      );

      if (response.data.status !== 'success' || !response.data.data?.checkout_url) {
        throw new InternalServerErrorException('Failed to initialize Chapa transaction.');
      }
      
      return { checkoutUrl: response.data.data.checkout_url };

    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      console.error('Chapa Initialization Error:', axiosError.response?.data || error.message);
      throw new InternalServerErrorException('Could not initiate payment.');
    }
  }

  private calculatePrice(pricingTier, durationDays: number): number {
    const { basePrice, baseDurationDays, additionalTiers } = pricingTier;

    if (durationDays < baseDurationDays) {
      return 0; 
    }
    
    let totalPrice = basePrice;
    let remainingDays = durationDays - baseDurationDays;
    
    if (remainingDays > 0 && additionalTiers) {
      const sortedTiers = [...additionalTiers].sort((a, b) => a.days - b.days);
      for (const tier of sortedTiers) {
        const timesToApply = Math.floor(remainingDays / tier.days);
        if (timesToApply > 0) {
          totalPrice += timesToApply * tier.price;
          remainingDays -= timesToApply * tier.days;
        }
      }
    }
    return parseFloat(totalPrice);
  }

  async verifyAndGrantAccess(chapaResponse: any): Promise<void> {
    const { tx_ref } = chapaResponse;
    
    if (!tx_ref) {
      console.warn('Chapa webhook called without tx_ref');
      return;
    }
    
    try {
      // --- FIX: Type the expected response from the HTTP call ---
      const verificationResponse = await firstValueFrom(
        this.httpService.get<ChapaTransactionResponse>(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
          headers: { Authorization: `Bearer ${this.chapaSecretKey}` },
        }),
      );
      
      if (verificationResponse.data.status !== 'success') {
        console.error(`Chapa verification failed for tx_ref: ${tx_ref}`);
        return;
      }

      const existingPurchase = await this.purchaseRepository.findOneBy({ chapaTransactionId: tx_ref });
      if (existingPurchase) {
        console.log(`Transaction ${tx_ref} has already been processed. Ignoring webhook.`);
        return;
      }

      const [, userIdStr, contentId] = tx_ref.split('-');
      const userId = parseInt(userIdStr, 10);
      const { amount } = verificationResponse.data.data;

      const user = await this.userRepository.findOneBy({ id: userId });
      const content = await this.contentRepository.findOneBy({ id: contentId });

      if (!user || !content) {
        console.error(`Invalid user or content ID parsed from tx_ref: ${tx_ref}`);
        return;
      }

      const purchasedDurationDays = 15; // <-- !!! PLACEHOLDER: NEEDS PROPER IMPLEMENTATION

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + purchasedDurationDays);
      
      const newPurchase = this.purchaseRepository.create({
        user: user,
        content: content,
        pricePaid: parseFloat((amount ?? 0).toString()),
        expiresAt: expiresAt,
        chapaTransactionId: tx_ref,
      });

      await this.purchaseRepository.save(newPurchase);
      console.log(`Access granted to user ${userId} for content ${contentId}`);

    } catch (error) {
        const axiosError = error as { response?: AxiosResponse };
        console.error('Chapa Verification/Granting Error:', axiosError.response?.data || error.message);
    }
  }
}