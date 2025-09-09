import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      // This module is imported in AppModule, so ConfigService is available
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          secure: true, // Use true for port 465, false for other ports
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          // Use the new, more structured "from" address
          from: `"${config.get<string>('MAIL_FROM_NAME')}" <${config.get<string>('MAIL_FROM_ADDRESS')}>`,
        },
        template: {
          // Define the path to the templates directory
          dir: join(process.cwd(), 'templates'),
          // Use the Handlebars adapter for .hbs files
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true, // Prevent using undefined variables in templates
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService], // Export the service so other modules (like AuthModule) can use it
})
export class MailModule {}