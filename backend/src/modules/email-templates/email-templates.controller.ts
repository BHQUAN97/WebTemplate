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
import { EmailTemplatesService } from './email-templates.service.js';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto.js';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto.js';
import { SendEmailDto } from './dto/send-email.dto.js';
import { PreviewEmailDto } from './dto/preview-email.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  /**
   * Danh sach templates (admin only).
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.emailTemplatesService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay chi tiet 1 template.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    const template = await this.emailTemplatesService.findById(id);
    return successResponse(template);
  }

  /**
   * Tao template moi (admin only).
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateEmailTemplateDto) {
    const template = await this.emailTemplatesService.create(dto as any);
    return successResponse(template, 'Email template created');
  }

  /**
   * Cap nhat template (admin only).
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    const template = await this.emailTemplatesService.update(id, dto as any);
    return successResponse(template, 'Email template updated');
  }

  /**
   * Xoa template (admin only, soft delete).
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.emailTemplatesService.softDelete(id);
    return successResponse(null, 'Email template deleted');
  }

  /**
   * Preview template voi variables (admin only).
   */
  @Post('preview')
  @Roles(UserRole.ADMIN)
  async preview(@Body() dto: PreviewEmailDto) {
    const result = await this.emailTemplatesService.preview(
      dto.template_id,
      dto.variables,
    );
    return successResponse(result);
  }

  /**
   * Gui email su dung template (admin only).
   */
  @Post('send')
  @Roles(UserRole.ADMIN)
  async send(@Body() dto: SendEmailDto) {
    const result = await this.emailTemplatesService.send(dto);
    return successResponse(result, 'Email sent');
  }

  /**
   * Seed cac template mac dinh (admin only).
   */
  @Post('seed')
  @Roles(UserRole.ADMIN)
  async seed() {
    await this.emailTemplatesService.seedDefaults();
    return successResponse(null, 'Default templates seeded');
  }
}
