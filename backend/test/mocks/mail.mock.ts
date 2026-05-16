import { Global, Module } from '@nestjs/common';
import { MailService } from '../../src/modules/mail/mail.service.js';

/**
 * Mock MailService — no-op, tranh phu thuoc BullMQ queue + S3 trong test.
 */
@Global()
@Module({
  providers: [
    {
      provide: MailService,
      useValue: {
        sendMail: jest.fn().mockResolvedValue(undefined),
      },
    },
  ],
  exports: [MailService],
})
export class MockMailModule {}
