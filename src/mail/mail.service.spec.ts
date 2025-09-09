import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { AuthProvider, User } from '../users/entities/user.entity';

const mockMailerService = {
  sendMail: jest.fn(),
};

describe('MailService', () => {
  let service: MailService;
  let mailerService: MailerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get<MailerService>(MailerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPasswordResetOTP', () => {
    it('should call mailerService.sendMail with the correct parameters', async () => {
      // Arrange
      // This object will NO LONGER CAUSE AN ERROR because the User type now allows null.
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890',
        agreedToTerms: true,
        authProvider: AuthProvider.LOCAL,
        googleId: null,
        facebookId: null,
        otp: null,
        otpExpiresAt: null,
        password: 'hashedpassword',
      };
      const mockOtp = '123456';

      // Act
      await service.sendPasswordResetOTP(mockUser, mockOtp);

      // Assert
      expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          template: 'password-reset',
        }),
      );
    });

    it('should not throw an error if mailerService.sendMail fails', async () => {
      const mockUser = {
        id: 2,
        email: 'fail@example.com',
        firstName: 'Fail',
      } as User;
      const mockOtp = '654321';
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(
        service.sendPasswordResetOTP(mockUser, mockOtp),
      ).resolves.not.toThrow();
    });
  });
});