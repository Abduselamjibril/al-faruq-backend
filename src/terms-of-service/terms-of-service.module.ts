import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermsOfServiceService } from './terms-of-service.service';
import { TermsOfServiceController } from './terms-of-service.controller';
import { TermsOfService } from './entities/terms-of-service.entity';
import { TermsOfServiceAcceptance } from './entities/terms-of-service-acceptance.entity';
import { AuthModule } from 'src/auth/auth.module';
import { TermsOfServiceGuard } from './guards/terms-of-service.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([TermsOfService, TermsOfServiceAcceptance]),
    // Use forwardRef to break circular dependency between Auth and ToS modules
    forwardRef(() => AuthModule),
  ],
  controllers: [TermsOfServiceController],
  // Provide the Guard so it can be injected
  providers: [TermsOfServiceService, TermsOfServiceGuard],
  // Export the Service and the Guard so other modules can use them
  exports: [TermsOfServiceService, TermsOfServiceGuard],
})
export class TermsOfServiceModule {}