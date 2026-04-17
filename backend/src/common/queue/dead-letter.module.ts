import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetter } from './dead-letter.queue.js';
import { DeadLetterService } from './dead-letter.service.js';
import { DeadLetterController } from './dead-letter.controller.js';

/**
 * DeadLetterModule — CRUD cho dead letter queue.
 * Marked @Global de moi processor (email/webhook/media) co the inject
 * DeadLetterService vao failed-listener ma khong phai import module.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DeadLetter])],
  controllers: [DeadLetterController],
  providers: [DeadLetterService],
  exports: [DeadLetterService],
})
export class DeadLetterModule {}
