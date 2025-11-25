// src/purchase/purchase.service.ts

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
import { AxiosResponse } from 'axios';

import { Purchase } from './entities/purchase.entity';
import { Content } from '../content/entities/content.entity';
import { User } from '../users/entities/user.entity';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';
import { PendingTransaction } from './entities/pending-transaction.entity';

interface ChapaTransactionResponse {
  message: string;
  status: string;
  data: {
    checkout_url?: string;
    amount?: number;
  };
}

@Injectable()
export class PurchaseService {
  private readonly chapaSecretKey: string;
  private readonly apiDomain: string;
  private readonly flutterReturnUrl: string;
  // --- [CHANGE 1 START] ---
  // Add properties to hold the new configuration values
  private readonly skylinkSubaccountId: string;
  private readonly skylinkSplitPercentage: number;
  // --- [CHANGE 1 END] ---

  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PendingTransaction)
    private readonly pendingTransactionRepository: Repository<PendingTransaction>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('CHAPA_SECRET_KEY');
    // --- [CORRECTED LINES START] ---
    const domain = this.configService.get<string>('API_DOMAIN');
    const returnUrl = this.configService.get<string>('FLUTTER_RETURN_URL');
    
    const subaccountId = this.configService.get<string>('SKYLINK_CHAPA_SUBACCOUNT_ID');
    const splitPercentage = this.configService.get<number>('SKYLINK_SPLIT_PERCENTAGE');
    // --- [CORRECTED LINES END] ---

    // Update the validation check to include the new required variables
    if (!secretKey || !domain || !returnUrl || !subaccountId || !splitPercentage) {
      throw new Error(
        'One or more required environment variables are not defined: CHAPA_SECRET_KEY, API_DOMAIN, FLUTTER_RETURN_URL, SKYLINK_CHAPA_SUBACCOUNT_ID, SKYLINK_SPLIT_PERCENTAGE',
      );
    }

    this.chapaSecretKey = secretKey;
    this.apiDomain = domain;
    this.flutterReturnUrl = returnUrl;
    // Assign the new properties
    this.skylinkSubaccountId = subaccountId;
    this.skylinkSplitPercentage = splitPercentage;
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
      throw new BadRequestException(
        'This content is not available for purchase.',
      );
    }

    const price = this.calculatePrice(content.pricingTier, durationDays);
    if (price <= 0) {
      throw new BadRequestException('Invalid duration or price calculation.');
    }

    const tx_ref = `alfaruq-${userId}-${contentId}-${randomBytes(8).toString(
      'hex',
    )}`;

    // Change chapaRequestBody to type 'any' to allow adding the 'splits' property
    const chapaRequestBody: any = {
      amount: price.toString(),
      currency: 'ETB',
      email: user.email || '',
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      tx_ref: tx_ref,
      callback_url: `${this.apiDomain}/purchase/chapa-webhook`,
      return_url: this.flutterReturnUrl,
      'customization[title]': 'Al-Faruq Content Purchase',
      'customization[description]': `Payment for ${content.title}`,
    };

    // Add the split payment instructions to the request body.
    // This object tells Chapa to perform the automatic 70/30 split.
    chapaRequestBody.splits = {
      subaccount: this.skylinkSubaccountId,
      transaction_charge_type: 'percentage',
      // Note: Chapa's API requires the value as a decimal (e.g., 0.30),
      // so we divide the percentage from the .env file by 100.
      transaction_charge: this.skylinkSplitPercentage / 100,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<ChapaTransactionResponse>(
          'https://api.chapa.co/v1/transaction/initialize',
          chapaRequestBody,
          {
            headers: { Authorization: `Bearer ${this.chapaSecretKey}` },
          },
        ),
      );

      if (
        response.data.status !== 'success' ||
        !response.data.data?.checkout_url
      ) {
        throw new InternalServerErrorException(
          'Failed to initialize Chapa transaction.',
        );
      }

      const pendingTx = this.pendingTransactionRepository.create({
        tx_ref: tx_ref,
        durationDays: durationDays,
      });
      await this.pendingTransactionRepository.save(pendingTx);

      return { checkoutUrl: response.data.data.checkout_url };
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      console.error(
        'Chapa Initialization Error:',
        axiosError.response?.data || error.message,
      );
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
    return parseFloat(totalPrice.toString());
  }

  async verifyAndGrantAccess(chapaResponse: any): Promise<void> {
    const { tx_ref } = chapaResponse;
    if (!tx_ref) {
      console.warn('Chapa webhook called without tx_ref');
      return;
    }

    const pendingTx = await this.pendingTransactionRepository.findOneBy({
      tx_ref,
    });
    if (!pendingTx) {
      console.warn(
        `Webhook for unknown or already processed tx_ref received: ${tx_ref}`,
      );
      return;
    }

    try {
      const verificationResponse = await firstValueFrom(
        this.httpService.get<ChapaTransactionResponse>(
          `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
          {
            headers: { Authorization: `Bearer ${this.chapaSecretKey}` },
          },
        ),
      );

      if (verificationResponse.data.status !== 'success') {
        console.error(`Chapa verification failed for tx_ref: ${tx_ref}`);
        return;
      }

      const [, userIdStr, contentId] = tx_ref.split('-');
      const userId = parseInt(userIdStr, 10);
      const { amount } = verificationResponse.data.data;

      const user = await this.userRepository.findOneBy({ id: userId });
      const content = await this.contentRepository.findOneBy({ id: contentId });

      if (!user || !content) {
        console.error(
          `Invalid user or content ID parsed from tx_ref: ${tx_ref}`,
        );
        return;
      }

      const purchasedDurationDays = pendingTx.durationDays;
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

      await this.pendingTransactionRepository.remove(pendingTx);

      console.log(`Access granted to user ${userId} for content ${contentId}`);
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      console.error(
        'Chapa Verification/Granting Error:',
        axiosError.response?.data || error.message,
      );
    }
  }
}