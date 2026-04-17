import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ContactsService } from './contacts.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';
import { QueryContactsDto } from './dto/query-contacts.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * Public — gui form lien he.
   */
  @Public()
  @Post()
  async create(@Body() dto: CreateContactDto) {
    const contact = await this.contactsService.createContact(dto);
    return successResponse(contact, 'Contact submitted');
  }

  /**
   * Admin — thong ke lien he theo trang thai.
   */
  @Roles(UserRole.ADMIN)
  @Get('stats')
  async getStats() {
    const stats = await this.contactsService.getStats();
    return successResponse(stats);
  }

  /**
   * Admin — lay danh sach lien he (phan trang).
   */
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(@Query() query: QueryContactsDto) {
    const { items, meta } = await this.contactsService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Admin — lay chi tiet lien he.
   */
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async findById(@Param('id') id: string) {
    const contact = await this.contactsService.findById(id);
    return successResponse(contact);
  }

  /**
   * Admin — cap nhat lien he (status, notes, assign).
   */
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    const contact = await this.contactsService.update(id, dto as any);
    return successResponse(contact, 'Contact updated');
  }
}
