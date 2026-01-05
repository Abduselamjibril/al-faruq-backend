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
  Param,
  ParseUUIDPipe,
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
import { UnlockContentDto } from './dto/unlock-content.dto'; // --- [NEW] ---

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

  // --- [NEW] UNLOCK ENDPOINT ---
  @Post('unlock/:contentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Initiate an unlock purchase for a specific content item and get a payment URL',
  })
  @ApiBody({ type: UnlockContentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment successfully initiated. Returns a checkoutUrl.',
    type: InitiatePurchaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request. Content may not be available for purchase or user already has access.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found. The specified user or content does not exist.',
  })
  unlockContent(
    @GetUser() user: { id: number },
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() unlockContentDto: UnlockContentDto,
  ): Promise<InitiatePurchaseResponseDto> {
    return this.purchaseService.initiateUnlock(
      user.id,
      contentId,
      unlockContentDto,
    );
  }

  // --- [DEPRECATED] This endpoint will be removed later. ---
  // @Post('initiate') ...

  @Get('verify-redirect')
  @ApiOperation({
    summary:
      'Handle Chapa return, verify transaction, and Auto-Redirect to App',
  })
  async verifyAndRedirect(
    @Query('tx_ref') tx_ref: string,
    @Res() res: Response,
  ) {
    let isSuccess = false;
    if (tx_ref) {
      isSuccess = await this.purchaseService.verifyAndGrantAccess({ tx_ref });
    }
    const successUrl =
      process.env.FLUTTER_RETURN_URL || 'app://alfaruq/purchase-success';
    const failedUrl =
      process.env.FLUTTER_FAILED_URL || 'app://alfaruq/purchase-failed';
    const targetUrl = isSuccess ? successUrl : failedUrl;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>${
            isSuccess ? 'Payment Successful' : 'Payment Failed'
          }</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script>
              window.location.href = "${targetUrl}";
          </script>
      </head>
      <body>
        <p style="text-align: center; margin-top: 50px;">
           ${
             isSuccess ? 'Redirecting to App...' : 'Payment Failed. Redirecting...'
           }
        </p>
      </body>
      </html>
    `;
    res.send(html);
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