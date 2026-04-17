import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { ChatSchedule } from './entities/chat-schedule.entity.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';

/**
 * ChatSchedulesService — CRUD cho ChatSchedule.
 * Logic tinh currentMode nam trong ChatService.getCurrentMode().
 */
@Injectable()
export class ChatSchedulesService extends BaseService<ChatSchedule> {
  protected searchableFields = ['name'];

  constructor(
    @InjectRepository(ChatSchedule)
    private readonly schedulesRepo: Repository<ChatSchedule>,
  ) {
    super(schedulesRepo, 'ChatSchedule');
  }

  /**
   * Tao schedule moi.
   */
  async createSchedule(dto: CreateScheduleDto): Promise<ChatSchedule> {
    return this.create(dto as any);
  }

  /**
   * Cap nhat schedule.
   */
  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<ChatSchedule> {
    return this.update(id, dto as any);
  }
}
