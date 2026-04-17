import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { QueryArticlesDto } from './dto/query-articles.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';

/**
 * Articles — read via @Public() per-method; write endpoints require ADMIN/MANAGER.
 */
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  /**
   * Lay danh sach bai viet (admin, phan trang + loc).
   */
  @Get()
  async findAll(@Query() query: QueryArticlesDto) {
    const { items, meta } = await this.articlesService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay danh sach bai viet da xuat ban (public).
   */
  @Public()
  @Get('published')
  async findPublished(@Query() query: PaginationDto) {
    const { items, meta } = await this.articlesService.findPublished(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay bai viet theo slug (public).
   */
  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const article = await this.articlesService.findBySlug(slug);
    // Tang luot xem
    await this.articlesService.incrementViewCount(article.id);
    return successResponse(article);
  }

  /**
   * Lay bai viet lien quan.
   */
  @Public()
  @Get(':id/related')
  async findRelated(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    const items = await this.articlesService.findRelated(id, limit || 5);
    return successResponse(items);
  }

  /**
   * Lay chi tiet bai viet theo ID.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    const article = await this.articlesService.findById(id);
    return successResponse(article);
  }

  /**
   * Tao bai viet moi.
   */
  @Post()
  async create(
    @Body() dto: CreateArticleDto,
    @CurrentUser('id') userId: string,
  ) {
    const article = await this.articlesService.createArticle(dto, userId);
    return successResponse(article, 'Article created');
  }

  /**
   * Xuat ban bai viet (admin).
   */
  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    const article = await this.articlesService.publish(id);
    return successResponse(article, 'Article published');
  }

  /**
   * Huy xuat ban bai viet (admin).
   */
  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string) {
    const article = await this.articlesService.unpublish(id);
    return successResponse(article, 'Article unpublished');
  }

  /**
   * Cap nhat bai viet.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    const article = await this.articlesService.update(id, dto as any);
    return successResponse(article, 'Article updated');
  }

  /**
   * Xoa mem bai viet.
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.articlesService.softDelete(id);
    return successResponse(null, 'Article deleted');
  }
}
