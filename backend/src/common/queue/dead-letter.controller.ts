import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeadLetterService } from './dead-letter.service.js';
import { Roles } from '../decorators/roles.decorator.js';
import { UserRole } from '../constants/index.js';
import { successResponse } from '../utils/response.js';

/**
 * DLQ admin endpoints — cho admin xem va xu ly cac job fail vinh vien.
 */
@ApiTags('Admin / Dead Letter Queue')
@ApiBearerAuth()
@Controller('admin/dlq')
@Roles(UserRole.ADMIN)
export class DeadLetterController {
  constructor(private readonly dlqService: DeadLetterService) {}

  /**
   * GET /admin/dlq — list DLQ items.
   */
  @Get()
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('queue') queue?: string,
    @Query('status') status?: 'pending' | 'requeued' | 'purged',
  ) {
    const result = await this.dlqService.list({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      queue,
      status,
    });
    return successResponse(result);
  }

  /**
   * POST /admin/dlq/:id/retry — requeue 1 item.
   */
  @Post(':id/retry')
  async retry(@Param('id') id: string) {
    const result = await this.dlqService.retry(id);
    return successResponse(result, 'Job requeued');
  }

  /**
   * DELETE /admin/dlq/:id — purge (soft delete).
   */
  @Delete(':id')
  async purge(@Param('id') id: string) {
    await this.dlqService.purge(id);
    return successResponse(null, 'Dead letter purged');
  }
}
