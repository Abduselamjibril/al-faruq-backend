import { ApiProperty } from '@nestjs/swagger';

export class InitiatePurchaseResponseDto {
  @ApiProperty({
    description: 'The checkout URL provided by the payment gateway (Chapa).',
    example: 'https://checkout.chapa.co/checkout/payment/somelonguniqueid',
  })
  checkoutUrl: string;
}