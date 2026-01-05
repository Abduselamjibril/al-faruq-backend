// src/privacy-policy/privacy-policy.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyPolicyService } from './privacy-policy.service';
import { PrivacyPolicyController } from './privacy-policy.controller';
import { PrivacyPolicy } from './entities/privacy-policy.entity';
import { UserPrivacyPolicyAcceptance } from './entities/user-privacy-policy-acceptance.entity';
import { UsersModule } from '../users/users.module';
import { UploadModule } from '../upload/upload.module'; // --- [NEW] IMPORT UPLOAD MODULE ---

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivacyPolicy, UserPrivacyPolicyAcceptance]),
    UsersModule,
    UploadModule, // --- [NEW] ADD UPLOAD MODULE HERE ---
  ],
  controllers: [PrivacyPolicyController],
  providers: [PrivacyPolicyService],
  exports: [PrivacyPolicyService], // We will need this later for the AuthModule
})
export class PrivacyPolicyModule {}