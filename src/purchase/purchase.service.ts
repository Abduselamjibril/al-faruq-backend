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
import { DataSource, Repository } from 'typeorm';
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
import { AccessType } from '../common/enums/access-type.enum';

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
  private readonly vatPercentage: number;
  private readonly chapaFeePercentage: number;

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
    private readonly dataSource: DataSource, // Inject DataSource for transactions
  ) {
    this.logger.log(
      'PurchaseService constructor: Loading environment variables...',
    );
    const secretKey = this.configService.get<string>('CHAPA_SECRET_KEY');
    const domain = this.configService.get<string>('API_DOMAIN');
    const subaccountId = this.configService.get<string>(
      'SKYLINK_CHAPA_SUBACCOUNT_ID',
    );
    const splitPercentage = this.configService.get<number>(
      'SKYLINK_SPLIT_PERCENTAGE',
    );
    const vat = this.configService.get<number>('VAT_PERCENTAGE');
    const fee = this.configService.get<number>('CHAPA_FEE_PERCENTAGE');

    if (
      !secretKey ||
      !domain ||
      !subaccountId ||
      !splitPercentage ||
      !vat ||
      !fee
    ) {
      throw new Error(
        'Required env vars missing: CHAPA_SECRET_KEY, API_DOMAIN, SKYLINK_CHAPA_SUBACCOUNT_ID, SKYLINK_SPLIT_PERCENTAGE, VAT_PERCENTAGE, CHAPA_FEE_PERCENTAGE',
      );
    }

    this.chapaSecretKey = secretKey;
    this.apiDomain = domain;
    this.skylinkSubaccountId = subaccountId;
    this.skylinkSplitPercentage = splitPercentage;
    this.vatPercentage = vat / 100; // Convert to decimal e.g., 15 -> 0.15
    this.chapaFeePercentage = fee / 100; // Convert to decimal e.g., 3.5 -> 0.035
    this.logger.log(
      'PurchaseService constructor: Environment variables loaded successfully.',
    );
  }

  async initiatePurchase(
    userId: string,
    initiatePurchaseDto: InitiatePurchaseDto,
  ) {
    const { contentId, accessType } = initiatePurchaseDto;
    this.logger.log(
      `[initiatePurchase] UserID: ${userId}, ContentID: ${contentId}, AccessType: ${accessType}`,
    );

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.email) {
      throw new NotFoundException(
        `User with ID ${userId} not found or has no email.`,
      );
    }

    const content = await this.contentRepository.findOneBy({ id: contentId });
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    const hasAccess = await this.entitlementService.checkUserAccess(
      userId,
      contentId,
    );
    if (hasAccess) {
      throw new BadRequestException('User already has access to this content.');
    }

    const pricing = await this.pricingRepository.findOneBy({
      contentId,
      accessType,
      isActive: true,
    });

    if (!content.isLocked || !pricing) {
      throw new BadRequestException(
        `This content is not available for the specified purchase type.`,
      );
    }

    const basePrice = parseFloat(pricing.basePrice.toString());
    const { isVatAdded } = pricing;

    // --- DYNAMIC VAT CALCULATION ---
    let vatAmount = 0;
    let grossAmountToCharge = 0;

    if (isVatAdded) {
      // Case 1: Customer pays VAT. It's added on top of the base price.
      vatAmount = basePrice * this.vatPercentage;
      grossAmountToCharge = basePrice + vatAmount;
    } else {
      // Case 2: Platform absorbs VAT. Base price already includes it.
      const netBeforeVat = basePrice / (1 + this.vatPercentage);
      vatAmount = basePrice - netBeforeVat;
      grossAmountToCharge = basePrice;
    }
    // --- END OF VAT CALCULATION ---

    const tx_ref = `tx-${randomBytes(16).toString('hex')}`;
    const transactionCharge = this.skylinkSplitPercentage / 100;
    const splits = {
      subaccount: this.skylinkSubaccountId,
      transaction_charge_type: 'percentage',
      transaction_charge: transactionCharge,
    };
    const httpsReturnUrl = `${this.apiDomain}/purchase/verify-redirect?tx_ref=${tx_ref}`;
    const webhookUrl = `${this.apiDomain}/purchase/chapa-webhook`;

    const chapaRequestBody: any = {
      amount: grossAmountToCharge.toFixed(2), // Send the final calculated amount
      currency: 'ETB',
      email: user.email,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      tx_ref: tx_ref,
      callback_url: webhookUrl,
      return_url: httpsReturnUrl,
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

      if (
        response.data.status !== 'success' ||
        !response.data.data?.checkout_url
      ) {
        throw new InternalServerErrorException(
          'Failed to initialize Chapa transaction.',
        );
      }

      // Save the pre-calculated values to the temporary transaction record
      const pendingTx = this.pendingTransactionRepository.create({
        tx_ref,
        userId,
        contentId,
        accessType: accessType,
        durationDays: pricing.durationDays,
        paymentType: PaymentType.UNLOCK,
        contentScope: content.type as unknown as EntitlementContentScope,
        baseAmount: basePrice,
        vatAmount: vatAmount,
        grossAmount: grossAmountToCharge,
      });
      await this.pendingTransactionRepository.save(pendingTx);

      return { checkoutUrl: response.data.data.checkout_url };
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      this.logger.error(
        `[initiatePurchase] Chapa Error:`,
        axiosError.response?.data || error.message,
      );
      throw new InternalServerErrorException('Could not initiate payment.');
    }
  }

  async verifyAndGrantAccess(chapaResponse: any): Promise<boolean> {
    const { tx_ref } = chapaResponse;
    if (!tx_ref) {
      this.logger.warn('[verifyAndGrantAccess] No tx_ref provided.');
      return false;
    }
    const pendingTx = await this.pendingTransactionRepository.findOneBy({
      tx_ref,
    });
    if (!pendingTx) {
      const existingPurchase = await this.purchaseRepository.findOneBy({
        chapaTransactionId: tx_ref,
      });
      if (existingPurchase) {
        return true;
      }
      this.logger.warn(
        `[verifyAndGrantAccess] Unknown or already processed tx_ref: ${tx_ref}.`,
      );
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

      const {
        userId,
        contentId,
        accessType,
        contentScope,
        durationDays,
        baseAmount,
        vatAmount,
        grossAmount,
      } = pendingTx;

      const user = await this.userRepository.findOneBy({ id: userId });
      const content = await this.contentRepository.findOneBy({ id: contentId });
      if (!user || !content) {
        throw new Error(`Invalid user or content in pending TX ${tx_ref}`);
      }

      // --- FINANCIAL SETTLEMENT CALCULATION (Corrected) ---
      // This happens *after* payment is confirmed. We calculate what the fee was for our records.
      const transactionFee = grossAmount * this.chapaFeePercentage;
      const netAmountForSplit = grossAmount - transactionFee - vatAmount;
      // --- END OF SETTLEMENT CALCULATION ---

      let expiresAt: Date | null = null;
      if (accessType === AccessType.TEMPORARY && durationDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
      }

      // Use a database transaction to ensure all records are created or none are.
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        const newPurchase = transactionalEntityManager.create(Purchase, {
          user,
          content,
          purchasedContentId: contentId,
          expiresAt: expiresAt,
          chapaTransactionId: tx_ref,
          paymentType: pendingTx.paymentType,
          contentScope: contentScope as unknown as ContentScope,
          baseAmount,
          vatAmount,
          transactionFee,
          grossAmount,
          netAmountForSplit,
        });
        const savedPurchase = await transactionalEntityManager.save(
          newPurchase,
        );

        const newEntitlement = transactionalEntityManager.create(
          UserContentEntitlement,
          {
            userId,
            contentId,
            contentType: contentScope,
            accessType,
            validFrom: new Date(),
            validUntil: expiresAt,
            source: EntitlementSource.TOP_UP,
            purchaseId: savedPurchase.id,
          },
        );
        await transactionalEntityManager.save(newEntitlement);

        await transactionalEntityManager.remove(pendingTx);
      });

      return true;
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse };
      this.logger.error(
        `[verifyAndGrantAccess] Error for ${tx_ref}:`,
        axiosError.response?.data || error.message,
      );
      // Ensure pending transaction is removed even on failure to prevent retries
      await this.pendingTransactionRepository.remove(pendingTx);
      return false;
    }
  }
}