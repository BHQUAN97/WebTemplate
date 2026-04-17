import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Navigation } from './entities/navigation.entity.js';
import { NavigationItem } from './entities/navigation-item.entity.js';
import { NavigationService } from './navigation.service.js';
import { NavigationController } from './navigation.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Navigation, NavigationItem])],
  controllers: [NavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}
