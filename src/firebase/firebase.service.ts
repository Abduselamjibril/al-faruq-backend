// src/firebase/firebase.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';

export interface NotificationPayload {
  title: string;
  body: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private _firebaseAdmin: admin.app.App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      const serviceAccountPath = resolve(
        process.cwd(),
        'firebase-service-account.json',
      );

      this._firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });

      this.logger.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  get messaging(): admin.messaging.Messaging {
    if (!this._firebaseAdmin) {
      throw new Error('Firebase Admin SDK not initialized.');
    }
    return this._firebaseAdmin.messaging();
  }

  /**
   * Sends a notification to multiple device tokens and returns a list of stale tokens.
   * @param tokens - An array of FCM tokens (max 500).
   * @param payload - The notification title and body.
   * @returns An array of stale tokens that should be removed from the database.
   */
  async sendMulticastNotification(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<string[]> {
    if (tokens.length === 0) {
      return [];
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      // You can also add 'data' for silent notifications
      // data: { ... }
    };

    const staleTokens: string[] = [];
    try {
      const response = await this.messaging.sendEachForMulticast(message);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Check for the specific error code that indicates an invalid/unregistered token
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            staleTokens.push(tokens[idx]);
          } else {
            this.logger.error(
              `Failed to send notification to token ${tokens[idx]}`,
              resp.error,
            );
          }
        }
      });
    } catch (error) {
      this.logger.error('Error sending multicast notification:', error);
    }

    return staleTokens;
  }
}