import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ChatSchedulesService } from './chat-schedules.service.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

/**
 * Admin CRUD chat schedules — mode lam viec theo gio.
 */
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/chat/schedules')
export class ChatSchedulesController {
  constructor(private readonly schedulesService: ChatSchedulesService) {}

  @Get()
  async list(@Query() query: PaginationDto) {
    const { items, meta } = await this.schedulesService.findAll(query);
    return paginatedResponse(items, meta);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return successResponse(await this.schedulesService.findById(id));
  }

  @Post()
  async create(@Body() dto: CreateScheduleDto) {
    const created = await this.schedulesService.createSchedule(dto);
    return successResponse(created, 'Schedule created');
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    const updated = await this.schedulesService.updateSchedule(id, dto);
    return successResponse(updated, 'Schedule updated');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.schedulesService.softDelete(id);
    return successResponse(null, 'Schedule deleted');
  }
}
