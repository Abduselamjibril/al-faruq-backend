import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermsOfServiceService } from './terms-of-service.service';
import { TermsOfServiceController } from './terms-of-service.controller';
import { TermsOfService } from './entities/terms-of-service.entity';
import { TermsOfServiceAcceptance } from './entities/terms-of-service-acceptance.entity';
import { AuthModule } from 'src/auth/auth.module'; // Import if guards are there

@Module({
  imports: [
    TypeOrmModule.forFeature([TermsOfService, TermsOfServiceAcceptance]),
    AuthModule, // Make Auth module available if your guards are not global
  ],
  controllers: [TermsOfServiceController],
  providers: [TermsOfServiceService],
  exports: [TermsOfServiceService], // Export the service for the global guard
})
export class TermsOfServiceModule {}