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
import { ChatScenariosService } from './chat-scenarios.service.js';
import { CreateScenarioDto } from './dto/create-scenario.dto.js';
import { UpdateScenarioDto } from './dto/update-scenario.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

/**
 * Admin CRUD chat scenarios — template tra loi tu dong.
 */
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/chat/scenarios')
export class ChatScenariosController {
  constructor(private readonly scenariosService: ChatScenariosService) {}

  @Get()
  async list(@Query() query: PaginationDto) {
    const { items, meta } = await this.scenariosService.findAll(query);
    return paginatedResponse(items, meta);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return successResponse(await this.scenariosService.findById(id));
  }

  @Post()
  async create(@Body() dto: CreateScenarioDto) {
    const created = await this.scenariosService.createScenario(dto);
    return successResponse(created, 'Scenario created');
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateScenarioDto) {
    const updated = await this.scenariosService.updateScenario(id, dto);
    return successResponse(updated, 'Scenario updated');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.scenariosService.softDelete(id);
    return successResponse(null, 'Scenario deleted');
  }
}
