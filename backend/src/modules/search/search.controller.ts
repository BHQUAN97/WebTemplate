import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchDto } from './dto/search.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Public — tim kiem toan cuc across products, articles, pages.
   */
  @Public()
  @Get()
  async search(@Query() query: SearchDto) {
    const result = await this.searchService.search(query);
    return successResponse(result);
  }
}
