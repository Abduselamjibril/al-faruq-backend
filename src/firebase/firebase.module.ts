// src/firebase/firebase.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseService } from './firebase.service';

@Global() // Makes the FirebaseService available application-wide
@Module({
  imports: [ConfigModule], // Import ConfigModule to use ConfigService
  providers: [FirebaseService],
  exports: [FirebaseService], // Export the service so it can be injected elsewhere
})
export class FirebaseModule {}