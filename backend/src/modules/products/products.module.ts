import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { ProductVariant } from './entities/product-variant.entity.js';
import { ProductAttribute } from './entities/product-attribute.entity.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, ProductAttribute]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
