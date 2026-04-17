import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Lay danh sach san pham (phan trang + loc).
   */
  @Get()
  async findAll(@Query() query: QueryProductsDto) {
    const { items, meta } = await this.productsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay danh sach san pham noi bat.
   */
  @Get('featured')
  async findFeatured(@Query('limit') limit?: number) {
    const items = await this.productsService.findFeatured(limit || 10);
    return successResponse(items);
  }

  /**
   * Lay san pham theo slug.
   */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    // Tang luot xem
    await this.productsService.updateViewCount(product.id);
    return successResponse(product);
  }

  /**
   * Lay chi tiet san pham theo ID.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    const product = await this.productsService.findByIdWithVariants(id);
    return successResponse(product);
  }

  /**
   * Tao san pham moi (kem variants neu co).
   */
  @Post()
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.createWithVariants(dto);
    return successResponse(product, 'Product created');
  }

  /**
   * Cap nhat san pham.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const product = await this.productsService.update(id, dto as any);
    return successResponse(product, 'Product updated');
  }

  /**
   * Cap nhat variants cua san pham.
   */
  @Put(':id/variants')
  async updateVariants(
    @Param('id') id: string,
    @Body() variants: CreateProductDto['variants'],
  ) {
    // Dam bao san pham ton tai
    const product = await this.productsService.findById(id);
    // Delegate to service — update variants
    const updated = await this.productsService.createWithVariants({
      name: product.name,
      description: product.description,
      price: product.price as number,
      variants,
    });
    return successResponse(updated, 'Variants updated');
  }

  /**
   * Xoa mem san pham.
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.productsService.softDelete(id);
    return successResponse(null, 'Product deleted');
  }
}
