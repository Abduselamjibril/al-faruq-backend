import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Sends a password reset OTP email to a user using a template.
   * It first checks if the user has an email address before attempting to send.
   * @param user The user entity, which might or might not have an email.
   * @param otp The 6-digit One-Time Password to send.
   */
  async sendPasswordResetOTP(user: User, otp: string): Promise<void> {
    // --- THE FIX IS HERE (Guard Clause) ---
    // If the user does not have an email address, we cannot send an email.
    // We log this for our records and exit the function gracefully.
    if (!user.email) {
      console.error(
        `Attempted to send password reset OTP to user with ID ${user.id}, but they have no email address.`,
      );
      return; // Stop execution
    }
    // ------------------------------------

    // Because of the check above, TypeScript now knows that from this point
    // forward, `user.email` MUST be a string. This is called "type narrowing",
    // and it resolves the error.
    try {
      await this.mailerService.sendMail({
        to: user.email, // This is now guaranteed to be a string
        subject: 'Your Al-faruq App Password Reset Code',
        template: 'password-reset',
        context: {
          firstName: user.firstName,
          otp: otp,
        },
      });
    } catch (error) {
      console.error(`Failed to send password reset OTP email to ${user.email}`, error);
    }
  }
}