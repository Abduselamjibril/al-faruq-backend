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

  // --- NEW BRIDGE ENDPOINT ---
  @Get('verify-redirect')
  @ApiOperation({
    summary: 'Handle Chapa return, verify transaction, and redirect to App',
  })
  async verifyAndRedirect(
    @Query('tx_ref') tx_ref: string,
    @Res() res: Response,
  ) {
    // 1. Verify the transaction immediately on the server side
    // This ensures access is granted even if the app fails to load
    if (tx_ref) {
      await this.purchaseService.verifyAndGrantAccess({ tx_ref });
    }

    // 2. Redirect to the Flutter App (Deep Link)
    // The browser will receive a 302 code and the OS will open the App
    const flutterReturnUrl =
      process.env.FLUTTER_RETURN_URL || 'app://alfaruq/purchase-success';
      
    return res.redirect(flutterReturnUrl);
  }

  // --- WEBHOOK ENDPOINT (MUST REMAIN PUBLIC) ---
  @ApiExcludeEndpoint()
  @All('chapa-webhook')
  @HttpCode(HttpStatus.OK)
  async chapaWebhook(@Body() body: any, @Req() req: any) {
    const chapaResponse = Object.keys(body).length > 0 ? body : req.query;
    console.log('Chapa webhook received:', chapaResponse);
    this.purchaseService.verifyAndGrantAccess(chapaResponse);
    return;
  }
}