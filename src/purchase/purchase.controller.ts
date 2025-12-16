// src/purchase/purchase.controller.ts

import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  All,
  createParamDecorator,
  ExecutionContext,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';
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

// Note: To avoid duplication, this should be moved to its own file.
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('Purchase (User-Facing)')
@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('initiate')
  // --- GUARDS AND ROLES APPLIED TO THIS ENDPOINT ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate a content purchase and get a payment URL (User Only)',
  })
  @ApiBody({ type: InitiatePurchaseDto })
  @ApiResponse({
    status: 201,
    description: 'Payment successfully initiated. Returns a checkoutUrl.',
    type: InitiatePurchaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Content may not be available for purchase or duration is invalid.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found. The specified user or content does not exist.',
  })
  initiatePurchase(
    @GetUser() user: { id: number },
    @Body() initiatePurchaseDto: InitiatePurchaseDto,
  ): Promise<InitiatePurchaseResponseDto> {
    return this.purchaseService.initiatePurchase(user.id, initiatePurchaseDto);
  }

  // --- UPDATED BRIDGE ENDPOINT (Conditional Redirect) ---
  @Get('verify-redirect')
  @ApiOperation({
    summary: 'Handle Chapa return, verify transaction, and Auto-Redirect to App',
  })
  async verifyAndRedirect(
    @Query('tx_ref') tx_ref: string,
    @Res() res: Response,
  ) {
    let isSuccess = false;

    // 1. Verify the transaction
    if (tx_ref) {
      // capture the result (true/false) from the service
      isSuccess = await this.purchaseService.verifyAndGrantAccess({ tx_ref });
    }

    // 2. Prepare the App Link
    // Define both Success and Failure URLs.
    // Ensure these are handled in your Flutter App.
    const successUrl = process.env.FLUTTER_RETURN_URL || 'app://alfaruq/purchase-success';
    const failedUrl = process.env.FLUTTER_FAILED_URL || 'app://alfaruq/purchase-failed';

    // 3. Select target URL based on success status
    const targetUrl = isSuccess ? successUrl : failedUrl;

    // 4. Send Automatic Javascript Redirect (The Fix for Android)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>${isSuccess ? 'Payment Successful' : 'Payment Failed'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script>
              // Automatically open the app immediately
              window.location.href = "${targetUrl}";
          </script>
      </head>
      <body>
        <p style="text-align: center; margin-top: 50px;">
           ${isSuccess ? 'Redirecting to App...' : 'Payment Failed. Redirecting...'}
        </p>
      </body>
      </html>
    `;

    res.send(html);
  }

  // --- WEBHOOK ENDPOINT (MUST REMAIN PUBLIC) ---
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