import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class InitiatePurchaseDto {
  @IsUUID()
  @IsNotEmpty()
  contentId: string;

  // We ask for total days. The backend will calculate the price.
  // This is more secure than accepting a price from the client.
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  durationDays: number;
}