import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Translation } from './entities/translation.entity.js';
import { Locale } from './entities/locale.entity.js';
import { I18nService } from './i18n.service.js';
import { I18nController } from './i18n.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Translation, Locale])],
  controllers: [I18nController],
  providers: [I18nService],
  exports: [I18nService],
})
export class I18nModule {}
