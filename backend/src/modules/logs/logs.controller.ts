import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { QueryLogsDto } from './dto/query-logs.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';
import { Changelog } from './entities/changelog.entity.js';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * Lay audit logs (admin only, co filter va phan trang).
   */
  @Get('audit')
  @Roles(UserRole.ADMIN)
  async getAuditLogs(@Query() query: QueryLogsDto) {
    const { items, meta } = await this.logsService.queryAuditLogs(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay access logs (admin only, co phan trang).
   */
  @Get('access')
  @Roles(UserRole.ADMIN)
  async getAccessLogs(@Query() query: PaginationDto) {
    const { items, meta } = await this.logsService.queryAccessLogs(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Thong ke audit logs theo action (admin only).
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStats(
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ) {
    const stats = await this.logsService.getStats(date_from, date_to);
    return successResponse(stats);
  }

  /**
   * Lay danh sach changelog (public).
   */
  @Get('changelog')
  @Public()
  async getChangelogs() {
    const changelogs = await this.logsService.getChangelogs();
    return successResponse(changelogs);
  }

  /**
   * Tao changelog entry moi (admin only).
   */
  @Post('changelog')
  @Roles(UserRole.ADMIN)
  async createChangelog(@Body() body: Partial<Changelog>) {
    const changelog = await this.logsService.createChangelog(body);
    return successResponse(changelog);
  }
}
