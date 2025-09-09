import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  All,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // <-- Import your JWT guard

// A custom decorator to get the user from the request object
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  /**
   * Endpoint for the mobile app to initiate a payment.
   * Requires the user to be authenticated.
   */
  @Post('initiate')
  // @UseGuards(JwtAuthGuard) // <-- PROTECT THIS ROUTE
  @UsePipes(new ValidationPipe({ whitelist: true }))
  initiatePurchase(
    @GetUser() user: { id: number }, // Assumes your JWT strategy adds a user object with an id to the request
    @Body() initiatePurchaseDto: InitiatePurchaseDto,
  ) {
    // A check to ensure the user object is present, in case the guard is forgotten
    if (!user || !user.id) {
        throw new Error('User information is missing from the request. Ensure JwtAuthGuard is active.');
    }
    return this.purchaseService.initiatePurchase(user.id, initiatePurchaseDto);
  }

  /**
   * Public webhook endpoint for Chapa to send payment status updates.
   * This endpoint MUST NOT have authentication guards.
   * It should accept both GET and POST as Chapa may use either for callbacks.
   */
  @All('chapa-webhook') // @All handles both GET and POST requests
  @HttpCode(HttpStatus.OK) // Respond with 200 OK to Chapa immediately
  async chapaWebhook(@Body() body: any, @Req() req: any) {
    // In some cases, Chapa might send data via query params on a GET request
    const chapaResponse = Object.keys(body).length > 0 ? body : req.query;

    console.log('Chapa webhook received:', chapaResponse);

    // We don't wait for the logic to finish. We tell Chapa "we got it"
    // and process the verification in the background.
    this.purchaseService.verifyAndGrantAccess(chapaResponse);

    // Chapa requires a 200 OK response to know the webhook was received successfully.
    // By not returning anything, NestJS sends a default 200 OK for POST or 201 for GET
    // which is what we want.
    return;
  }
}