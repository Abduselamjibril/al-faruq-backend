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
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody, // --- ADDED ---
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
// --- ADDED the new response DTO ---
import { InitiatePurchaseResponseDto } from './dto/initiate-purchase-response.dto';

// Note: To avoid duplication, this should be moved to its own file.
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('Purchase (User)')
@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @ApiOperation({
    summary: 'Initiate a content purchase and get a payment URL',
  })
  // --- ADDED ApiBody to show request example ---
  @ApiBody({ type: InitiatePurchaseDto })
  // --- UPDATED ApiResponse to show response example using our new DTO ---
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
    description: 'Unauthorized. A valid JWT is required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found. The specified user or content does not exist.',
  })
  @ApiBearerAuth()
  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiatePurchase(
    @GetUser() user: { id: number },
    @Body() initiatePurchaseDto: InitiatePurchaseDto,
  ): Promise<InitiatePurchaseResponseDto> { // --- UPDATED return type for clarity
    return this.purchaseService.initiatePurchase(user.id, initiatePurchaseDto);
  }

  @ApiExcludeEndpoint()
  @All('chapa-webhook')
  @HttpCode(HttpStatus.OK)
  async chapaWebhook(@Body() body: any, @Req() req: any) {
    const chapaResponse = Object.keys(body).length > 0 ? body : req.query;
    console.log('Chapa webhook received:', chapaResponse);
    // This is a fire-and-forget operation, no need to await it.
    this.purchaseService.verifyAndGrantAccess(chapaResponse);
    return;
  }
}