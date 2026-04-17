import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { QueryReviewsDto } from './dto/query-reviews.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Tao danh gia moi.
   */
  @Post()
  async create(@Body() dto: CreateReviewDto) {
    // TODO: Lay user_id tu JWT token
    const review = await this.reviewsService.create(dto as any);
    return successResponse(review, 'Review created');
  }

  /**
   * Lay danh gia cua san pham (public — chi approved).
   */
  @Public()
  @Get()
  async findAll(@Query() query: QueryReviewsDto) {
    if (query.product_id) {
      const result = await this.reviewsService.getProductReviews(
        query.product_id,
        query,
      );
      return paginatedResponse(result.items, result.meta);
    }
    // Default: chi tra ve approved reviews
    query.is_approved = true;
    const { items, meta } = await this.reviewsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay thong ke rating cua san pham.
   */
  @Public()
  @Get('stats/:productId')
  async getRatingStats(@Param('productId') productId: string) {
    const stats = await this.reviewsService.getProductRatingStats(productId);
    return successResponse(stats);
  }

  /**
   * Admin — lay tat ca danh gia (ke ca chua duyet).
   */
  @Roles(UserRole.ADMIN)
  @Get('admin')
  async findAllAdmin(@Query() query: QueryReviewsDto) {
    const { items, meta } = await this.reviewsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Admin — phe duyet danh gia.
   */
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    const review = await this.reviewsService.approve(id);
    return successResponse(review, 'Review approved');
  }

  /**
   * Admin — tu choi danh gia.
   */
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject')
  async reject(@Param('id') id: string) {
    const review = await this.reviewsService.reject(id);
    return successResponse(review, 'Review rejected');
  }

  /**
   * Admin — tra loi danh gia.
   */
  @Roles(UserRole.ADMIN)
  @Post(':id/reply')
  async reply(@Param('id') id: string, @Body('content') content: string) {
    const review = await this.reviewsService.reply(id, content);
    return successResponse(review, 'Reply added');
  }
}
