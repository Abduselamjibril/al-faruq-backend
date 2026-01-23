// src/purchase/purchase.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  All,
  createParamDecorator,
  ExecutionContext,
  Get,
  Query,
  Res,
  Req,
  Logger,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InitiatePurchaseResponseDto } from './dto/initiate-purchase-response.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import type { Response } from 'express';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('Purchase (User-Facing)')
@Controller('purchase')
export class PurchaseController {
  private readonly logger = new Logger(PurchaseController.name);

  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate a content purchase for a specific rental duration and get a payment URL',
  })
  @ApiBody({ type: InitiatePurchaseDto })
  @ApiResponse({ status: 201, description: 'Payment successfully initiated. Returns a checkoutUrl.', type: InitiatePurchaseResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid duration or user already has access.' })
  @ApiResponse({ status: 404, description: 'Not Found. The specified user or content does not exist.' })
  initiatePurchase(
    @GetUser() user: { id: string },
    @Body() initiatePurchaseDto: InitiatePurchaseDto,
  ): Promise<InitiatePurchaseResponseDto> {
    return this.purchaseService.initiatePurchase(user.id, initiatePurchaseDto);
  }

  @Get('verify-redirect')
  @ApiOperation({ summary: 'Handle Chapa return, verify transaction, and Auto-Redirect to App' })
  async verifyAndRedirect(@Query('tx_ref') tx_ref: string, @Res() res: Response) {
    if (!tx_ref) {
      this.logger.warn('[verify-redirect] Missing tx_ref');
      return res.status(400).json({ message: 'Missing tx_ref' });
    }

    this.logger.log(`[verify-redirect] Received tx_ref=${tx_ref}`);

    const isSuccess = await this.purchaseService.verifyAndGrantAccess({ tx_ref });
    this.logger.log(`[verify-redirect] Verification result for ${tx_ref}: ${isSuccess ? 'success' : 'failed'}`);

    const successUrl = process.env.FLUTTER_RETURN_URL || 'app://alfaruq/purchase-success';
    const failedUrl = process.env.FLUTTER_FAILED_URL || 'app://alfaruq/purchase-failed';
    const targetBase = isSuccess ? successUrl : failedUrl;
    const targetUrl = `${targetBase}${targetBase.includes('?') ? '&' : '?'}status=${isSuccess ? 'success' : 'failed'}&tx_ref=${encodeURIComponent(tx_ref)}`;

    this.logger.log(`[verify-redirect] Redirecting to ${targetUrl}`);

    return res.redirect(targetUrl);
  }

  @ApiExcludeEndpoint()
  @All('chapa-webhook')
  @HttpCode(HttpStatus.OK)
  async chapaWebhook(@Body() body: any, @Req() req: any) {
    const chapaResponse = Object.keys(body).length > 0 ? body : req.query;
    console.log('Chapa webhook received:', chapaResponse);
    await this.purchaseService.verifyAndGrantAccess(chapaResponse);
    return;
  }
}