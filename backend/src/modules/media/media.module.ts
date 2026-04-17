import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity.js';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';
import { MediaProcessor } from '../../common/queue/media.processor.js';

/**
 * MediaModule — upload S3 + resize sharp + enqueue background thumbnail.
 * MediaProcessor dang ky o day de access repo Media.
 * QueueModule @Global da dang ky queue "media-processing" roi.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [MediaService, MediaProcessor],
  exports: [MediaService],
})
export class MediaModule {}
