import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service.js';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import { paginatedResponse } from '../../common/utils/response.js';

/**
 * Controller cho audit logs — chi admin duoc xem.
 */
@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * GET /audit-logs — admin xem toan bo audit logs co filter + pagination.
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Liet ke audit logs (admin only)' })
  async findAll(@Query() query: QueryAuditLogsDto) {
    const { items, meta } = await this.auditLogsService.findAllFiltered(query);
    return paginatedResponse(items, meta);
  }
}
