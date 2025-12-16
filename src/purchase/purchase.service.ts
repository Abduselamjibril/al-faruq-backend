// src/purchase/purchase.service.ts

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(PurchaseService.name);

  private readonly chapaSecretKey: string;
  private readonly apiDomain: string;
  private readonly flutterReturnUrl: string;
  private readonly skylinkSubaccountId: string;
  private readonly skylinkSplitPercentage: number;

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
    this.logger.log('PurchaseService constructor: Loading environment variables...');
    const secretKey = this.configService.get<string>('CHAPA_SECRET_KEY');
    const domain = this.configService.get<string>('API_DOMAIN');
    const returnUrl = this.configService.get<string>('FLUTTER_RETURN_URL');
    const subaccountId = this.configService.get<string>(
      'SKYLINK_CHAPA_SUBACCOUNT_ID',
    );
    const splitPercentage = this.configService.get<number>(
      'SKYLINK_SPLIT_PERCENTAGE',
    );

    this.logger.debug(`Loaded SKYLINK_CHAPA_SUBACCOUNT_ID: ${subaccountId}`);
    this.logger.debug(`Loaded SKYLINK_SPLIT_PERCENTAGE: ${splitPercentage}`);

    if (
      !secretKey ||
      !domain ||
      !returnUrl ||
      !subaccountId ||
      !splitPercentage
    ) {
      this.logger.error('CRITICAL: One or more required environment variables are missing!');
      throw new Error(
        'One or more required environment variables are not defined: CHAPA_SECRET_KEY, API_DOMAIN, FLUTTER_RETURN_URL, SKYLINK_CHAPA_SUBACCOUNT_ID, SKYLINK_SPLIT_PERCENTAGE',
      );
    }

    this.chapaSecretKey = secretKey;
    this.apiDomain = domain;
    this.flutterReturnUrl = returnUrl;
    this.skylinkSubaccountId = subaccountId;
    this.skylinkSplitPercentage = splitPercentage;
    this.logger.log('PurchaseService constructor: Environment variables loaded successfully.');
  }

  async initiatePurchase(
    userId: number,
    initiatePurchaseDto: InitiatePurchaseDto,
  ) {
    this.logger.log(`[initiatePurchase] Starting for User ID: ${userId}`);
    const { contentId, durationDays } = initiatePurchaseDto;
    this.logger.debug(`[initiatePurchase] Content ID: ${contentId}, Duration: ${durationDays} days`);

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`[initiatePurchase] User with ID ${userId} not found.`);
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    if (!user.email) {
      this.logger.warn(`[initiatePurchase] User ID ${userId} has no email. Aborting.`);
      throw new BadRequestException(
        'User does not have an email address. Please update your profile before making a purchase.',
      );
    }
    this.logger.debug(`[initiatePurchase] User ${user.email} found.`);

    const content = await this.contentRepository.findOne({
      where: { id: contentId },
      relations: ['pricingTier'],
    });

    if (!content) {
      this.logger.warn(`[initiatePurchase] Content with ID ${contentId} not found.`);
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }
    if (!content.isLocked || !content.pricingTier) {
      this.logger.warn(`[initiatePurchase] Content ${content.title} is not available for purchase.`);
      throw new BadRequestException(
        'This content is not available for purchase.',
      );
    }
    this.logger.debug(`[initiatePurchase] Content ${content.title} found and is purchasable.`);

    const price = this.calculatePrice(content.pricingTier, durationDays);
    if (price <= 0) {
      this.logger.warn(`[initiatePurchase] Invalid price calculation for duration ${durationDays}. Result: ${price}`);
      throw new BadRequestException('Invalid duration or price calculation.');
    }
    this.logger.debug(`[initiatePurchase] Calculated price: ${price} ETB`);

    const tx_ref = `tx-${randomBytes(16).toString('hex')}`;
    this.logger.debug(`[initiatePurchase] Generated tx_ref: ${tx_ref}`);

    // Create splits object
    const transactionCharge = this.skylinkSplitPercentage / 100;
    const splits = {
      subaccount: this.skylinkSubaccountId,
      transaction_charge_type: 'percentage',
      transaction_charge: transactionCharge,
    };

    // Construct the HTTPS Return URL (The Bridge)
    // This points to the new verify-redirect endpoint we made in the Controller
    // NOTE: Added /api/ assuming your global prefix is 'api'.
    const httpsReturnUrl = `${this.apiDomain}/api/purchase/verify-redirect?tx_ref=${tx_ref}`;

    // Construct Webhook URL
    // NOTE: Added /api/ to match your screenshot configuration
    const webhookUrl = `${this.apiDomain}/api/purchase/chapa-webhook`;

    const chapaRequestBody: any = {
      amount: price.toString(),
      currency: 'ETB',
      email: user.email,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      tx_ref: tx_ref,
      callback_url: webhookUrl,
      return_url: httpsReturnUrl, // Use the HTTPS URL, not the app:// URL
      'customization[title]': 'Al-Faruq Content Purchase',
      'customization[description]': `Payment for ${content.title}`,
      splits: splits,
    };

    this.logger.log(`[initiatePurchase] Preparing to send request to Chapa for tx_ref: ${tx_ref}`);
    this.logger.debug(`[initiatePurchase] Chapa Request Body: ${JSON.stringify(chapaRequestBody, null, 2)}`);

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

      this.logger.log(`[initiatePurchase] Received successful response from Chapa for tx_ref: ${tx_ref}`);

      if (
        response.data.status !== 'success' ||
        !response.data.data?.checkout_url
      ) {
        this.logger.error(`[initiatePurchase] Chapa response was not successful for tx_ref: ${tx_ref}`, response.data);
        throw new InternalServerErrorException(
          'Failed to initialize Chapa transaction.',
        );
      }

      this.logger.debug(`[initiatePurchase] Creating pending transaction record for tx_ref: ${tx_ref}`);
      const pendingTx = this.pendingTransactionRepository.create({
        tx_ref: tx_ref,
        durationDays: durationDays,
        userId: userId,
        contentId: contentId,
      });
      await this.pendingTransactionRepository.save(pendingTx);
      this.logger.debug(`[initiatePurchase] Pending transaction saved successfully for tx_ref: ${tx_ref}`);

      return { checkoutUrl: response.data.data.checkout_url };
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      this.logger.error(`[initiatePurchase] Chapa Initialization Error for tx_ref: ${tx_ref}`, axiosError.response?.data || error.message);
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
    this.logger.log('[verifyAndGrantAccess] Webhook received from Chapa.');
    this.logger.debug(`[verifyAndGrantAccess] Full webhook payload: ${JSON.stringify(chapaResponse, null, 2)}`);
    const { tx_ref } = chapaResponse;
    if (!tx_ref) {
      this.logger.warn('[verifyAndGrantAccess] Webhook called without tx_ref. Aborting.');
      return;
    }
    this.logger.log(`[verifyAndGrantAccess] Processing webhook for tx_ref: ${tx_ref}`);

    const pendingTx = await this.pendingTransactionRepository.findOneBy({
      tx_ref,
    });
    if (!pendingTx) {
      this.logger.warn(
        `[verifyAndGrantAccess] Webhook for unknown or already processed tx_ref received: ${tx_ref}. Aborting.`,
      );
      return;
    }
    this.logger.debug(`[verifyAndGrantAccess] Found matching pending transaction for tx_ref: ${tx_ref}`);

    try {
      this.logger.log(`[verifyAndGrantAccess] Verifying transaction with Chapa for tx_ref: ${tx_ref}`);
      const verificationResponse = await firstValueFrom(
        this.httpService.get<ChapaTransactionResponse>(
          `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
          {
            headers: { Authorization: `Bearer ${this.chapaSecretKey}` },
          },
        ),
      );
        
      this.logger.log(`[verifyAndGrantAccess] Full verification data for tx_ref ${tx_ref}:`);
      this.logger.log(JSON.stringify(verificationResponse.data, null, 2));

      if (verificationResponse.data.status !== 'success') {
        this.logger.error(`[verifyAndGrantAccess] Chapa verification FAILED for tx_ref: ${tx_ref}`);
        return;
      }
      this.logger.log(`[verifyAndGrantAccess] Chapa verification SUCCESSFUL for tx_ref: ${tx_ref}`);

      const { userId, contentId } = pendingTx;
      const { amount } = verificationResponse.data.data;

      this.logger.debug(`[verifyAndGrantAccess] Granting access for User ID: ${userId}, Content ID: ${contentId}`);

      const user = await this.userRepository.findOneBy({ id: userId });
      const content = await this.contentRepository.findOneBy({ id: contentId });

      if (!user || !content) {
        this.logger.error(
          `[verifyAndGrantAccess] Invalid user or content ID found in pending transaction for tx_ref: ${tx_ref}`,
        );
        return;
      }

      const purchasedDurationDays = pendingTx.durationDays;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + purchasedDurationDays);
      
      this.logger.debug(`[verifyAndGrantAccess] Creating purchase record. Price: ${amount}, Expires At: ${expiresAt.toISOString()}`);

      const newPurchase = this.purchaseRepository.create({
        user: user,
        content: content,
        pricePaid: parseFloat((amount ?? 0).toString()),
        expiresAt: expiresAt,
        chapaTransactionId: tx_ref,
      });

      await this.purchaseRepository.save(newPurchase);
      this.logger.log(`[verifyAndGrantAccess] Purchase record saved for tx_ref: ${tx_ref}`);

      await this.pendingTransactionRepository.remove(pendingTx);
      this.logger.log(`[verifyAndGrantAccess] Pending transaction record removed for tx_ref: ${tx_ref}`);

      this.logger.log(`SUCCESS: Access granted to user ${userId} for content ${contentId}`);
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      this.logger.error(
        `[verifyAndGrantAccess] Chapa Verification/Granting Error for tx_ref: ${tx_ref}`,
        axiosError.response?.data || error.message,
      );
    }
  }
}