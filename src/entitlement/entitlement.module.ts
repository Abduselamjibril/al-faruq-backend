// src/entitlement/entitlement.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserContentEntitlement } from '../purchase/entities/user-content-entitlement.entity';
import { EntitlementService } from './entitlement.service';
import { Content } from '../content/entities/content.entity'; // --- [NEW] ---

@Module({
  imports: [
    // --- [CHANGED] Add Content entity to make its repository available ---
    TypeOrmModule.forFeature([UserContentEntitlement, Content]),
  ],
  providers: [EntitlementService],
  exports: [EntitlementService], // Export the service so other modules can use it
})
export class EntitlementModule {}