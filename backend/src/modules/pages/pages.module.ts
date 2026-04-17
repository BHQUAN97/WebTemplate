import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Page } from './entities/page.entity.js';
import { PagesService } from './pages.service.js';
import { PagesController } from './pages.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Page])],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
