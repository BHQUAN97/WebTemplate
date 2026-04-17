import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service.js';
import { UploadMediaDto } from './dto/upload-media.dto.js';
import { QueryMediaDto } from './dto/query-media.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Upload 1 file (multipart/form-data).
   * Limits + fileFilter: tu choi file qua 10MB va cac MIME khong trong whitelist som o interceptor.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = new Set([
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'video/mp4',
        ]);
        if (!allowed.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              `MIME type "${file.mimetype}" khong duoc phep`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const media = await this.mediaService.upload(file, user.id, dto);
    return successResponse(media, 'File uploaded successfully');
  }

  /**
   * Lay danh sach media co phan trang va filter.
   */
  @Get()
  async findAll(@Query() query: QueryMediaDto) {
    const { items, meta } = await this.mediaService.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * Lay thong tin 1 media theo ID.
   */
  @Get('folders')
  async getFolders() {
    const folders = await this.mediaService.getFolders();
    return successResponse(folders);
  }

  /**
   * Lay thong tin 1 media theo ID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const media = await this.mediaService.findById(id);
    return successResponse(media);
  }

  /**
   * Xoa 1 media (xoa khoi storage + DB).
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.mediaService.deleteMedia(id);
    return successResponse(null, 'Media deleted successfully');
  }
}
