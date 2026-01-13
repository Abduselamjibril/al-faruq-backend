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
import { Purchase, PaymentType, ContentScope } from './entities/purchase.entity';
import { Content } from '../content/entities/content.entity';
import { User } from '../users/entities/user.entity';
import { PendingTransaction } from './entities/pending-transaction.entity';
import { ContentPricing } from '../content/entities/content-pricing.entity';
import { EntitlementService } from '../entitlement/entitlement.service';
import {
  UserContentEntitlement,
  EntitlementSource,
  EntitlementContentScope,
} from './entities/user-content-entitlement.entity';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';
import { AccessType } from '../common/enums/access-type.enum'; // --- [FIXED] ---

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
    @InjectRepository(ContentPricing)
    private readonly pricingRepository: Repository<ContentPricing>,
    @InjectRepository(UserContentEntitlement)
    private readonly entitlementRepository: Repository<UserContentEntitlement>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly entitlementService: EntitlementService,
  ) {
    this.logger.log('PurchaseService constructor: Loading environment variables...');
    const secretKey = this.configService.get<string>('CHAPA_SECRET_KEY');
    const domain = this.configService.get<string>('API_DOMAIN');
    const subaccountId = this.configService.get<string>('SKYLINK_CHAPA_SUBACCOUNT_ID');
    const splitPercentage = this.configService.get<number>('SKYLINK_SPLIT_PERCENTAGE');

    if (!secretKey || !domain || !subaccountId || !splitPercentage) {
      throw new Error('Required env vars missing: CHAPA_SECRET_KEY, API_DOMAIN, SKYLINK_CHAPA_SUBACCOUNT_ID, SKYLINK_SPLIT_PERCENTAGE');
    }

    this.chapaSecretKey = secretKey;
    this.apiDomain = domain;
    this.skylinkSubaccountId = subaccountId;
    this.skylinkSplitPercentage = splitPercentage;
    this.logger.log('PurchaseService constructor: Environment variables loaded successfully.');
  }

  async initiatePurchase(userId: number, initiatePurchaseDto: InitiatePurchaseDto) {
    const { contentId, accessType } = initiatePurchaseDto;
    this.logger.log(`[initiatePurchase] UserID: ${userId}, ContentID: ${contentId}, AccessType: ${accessType}`);

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.email) {
      throw new NotFoundException(`User with ID ${userId} not found or has no email.`);
    }

    const content = await this.contentRepository.findOneBy({ id: contentId });
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    const hasAccess = await this.entitlementService.checkUserAccess(userId, contentId);
    if (hasAccess) {
      throw new BadRequestException('User already has access to this content.');
    }

    const pricing = await this.pricingRepository.findOneBy({
      contentId,
      accessType,
      isActive: true,
    });

    if (!content.isLocked || !pricing) {
      throw new BadRequestException(`This content is not available for the specified purchase type.`);
    }

    const price = parseFloat(pricing.price.toString());
    const tx_ref = `tx-${randomBytes(16).toString('hex')}`;
    const transactionCharge = this.skylinkSplitPercentage / 100;
    const splits = {
      subaccount: this.skylinkSubaccountId,
      transaction_charge_type: 'percentage',
      transaction_charge: transactionCharge,
    };
    const httpsReturnUrl = `${this.apiDomain}/api/purchase/verify-redirect?tx_ref=${tx_ref}`;
    const webhookUrl = `${this.apiDomain}/api/purchase/chapa-webhook`;

    const chapaRequestBody: any = {
      amount: price.toString(), currency: 'ETB', email: user.email,
      first_name: user.firstName || '', last_name: user.lastName || '',
      tx_ref: tx_ref, callback_url: webhookUrl, return_url: httpsReturnUrl,
      'customization[title]': 'Al-Faruq Content Purchase',
      'customization[description]': `Access to ${content.title}`,
      splits: splits,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<ChapaTransactionResponse>(
          'https://api.chapa.co/v1/transaction/initialize',
          chapaRequestBody,
          { headers: { Authorization: `Bearer ${this.chapaSecretKey}` } },
        ),
      );

      if (response.data.status !== 'success' || !response.data.data?.checkout_url) {
        throw new InternalServerErrorException('Failed to initialize Chapa transaction.');
      }

      const pendingTx = this.pendingTransactionRepository.create({
        tx_ref, userId, contentId,
        accessType: accessType,
        durationDays: pricing.durationDays,
        paymentType: PaymentType.UNLOCK,
        contentScope: content.type as unknown as EntitlementContentScope,
      });
      await this.pendingTransactionRepository.save(pendingTx);

      return { checkoutUrl: response.data.data.checkout_url };
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      this.logger.error(`[initiatePurchase] Chapa Error:`, axiosError.response?.data || error.message);
      throw new InternalServerErrorException('Could not initiate payment.');
    }
  }

  async verifyAndGrantAccess(chapaResponse: any): Promise<boolean> {
    const { tx_ref } = chapaResponse;
    if (!tx_ref) {
      this.logger.warn('[verifyAndGrantAccess] No tx_ref provided.');
      return false;
    }
    const pendingTx = await this.pendingTransactionRepository.findOneBy({ tx_ref });
    if (!pendingTx) {
      const existingPurchase = await this.purchaseRepository.findOneBy({ chapaTransactionId: tx_ref });
      if (existingPurchase) {
        return true;
      }
      this.logger.warn(`[verifyAndGrantAccess] Unknown or already processed tx_ref: ${tx_ref}.`);
      return false;
    }

    try {
      const verificationResponse = await firstValueFrom(
        this.httpService.get<ChapaTransactionResponse>(
          `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
          { headers: { Authorization: `Bearer ${this.chapaSecretKey}` } },
        ),
      );

      if (verificationResponse.data.status !== 'success') {
        await this.pendingTransactionRepository.remove(pendingTx);
        return false;
      }

      const { userId, contentId, accessType, contentScope, durationDays } = pendingTx;
      const amount = verificationResponse.data.data?.amount ?? 0;

      const user = await this.userRepository.findOneBy({ id: userId });
      const content = await this.contentRepository.findOneBy({ id: contentId });
      if (!user || !content) { throw new Error(`Invalid user or content in pending TX ${tx_ref}`); }

      let expiresAt: Date | null = null;
      if (accessType === AccessType.TEMPORARY && durationDays) { // --- [FIXED] ---
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
      }

      const newPurchase = this.purchaseRepository.create({
        user, content,
        pricePaid: parseFloat(amount.toString()),
        expiresAt: expiresAt,
        chapaTransactionId: tx_ref,
        paymentType: pendingTx.paymentType,
        contentScope: contentScope as unknown as ContentScope,
        purchasedContentId: contentId,
      });
      await this.purchaseRepository.save(newPurchase);

      const newEntitlement = this.entitlementRepository.create({
        userId, contentId,
        contentType: contentScope,
        accessType,
        validFrom: new Date(),
        validUntil: expiresAt,
        source: EntitlementSource.TOP_UP,
        purchaseId: newPurchase.id,
      });
      await this.entitlementRepository.save(newEntitlement);

      await this.pendingTransactionRepository.remove(pendingTx);
      return true;
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      this.logger.error(`[verifyAndGrantAccess] Error for ${tx_ref}:`, axiosError.response?.data || error.message);
      await this.pendingTransactionRepository.remove(pendingTx);
      return false;
    }
  }
}