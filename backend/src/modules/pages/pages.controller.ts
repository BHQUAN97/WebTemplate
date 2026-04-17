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
import { PagesService } from './pages.service.js';
import { CreatePageDto } from './dto/create-page.dto.js';
import { UpdatePageDto } from './dto/update-page.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  /**
   * Lay danh sach trang (admin, phan trang).
   */
  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.pagesService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay trang chu (public).
   */
  @Public()
  @Get('homepage')
  async getHomepage() {
    const page = await this.pagesService.getHomepage();
    return successResponse(page);
  }

  /**
   * Lay cay trang (admin).
   */
  @Get('tree')
  async getPageTree() {
    const tree = await this.pagesService.getPageTree();
    return successResponse(tree);
  }

  /**
   * Lay trang theo slug (public).
   */
  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const page = await this.pagesService.findBySlug(slug);
    return successResponse(page);
  }

  /**
   * Lay chi tiet trang theo ID.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    const page = await this.pagesService.findById(id);
    return successResponse(page);
  }

  /**
   * Tao trang moi.
   */
  @Post()
  async create(@Body() dto: CreatePageDto) {
    const page = await this.pagesService.createPage(dto);
    return successResponse(page, 'Page created');
  }

  /**
   * Dat trang lam homepage (admin).
   */
  @Put(':id/set-homepage')
  async setHomepage(@Param('id') id: string) {
    const page = await this.pagesService.setHomepage(id);
    return successResponse(page, 'Homepage updated');
  }

  /**
   * Cap nhat trang.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    const page = await this.pagesService.update(id, dto as any);
    return successResponse(page, 'Page updated');
  }

  /**
   * Xoa mem trang.
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.pagesService.softDelete(id);
    return successResponse(null, 'Page deleted');
  }
}
