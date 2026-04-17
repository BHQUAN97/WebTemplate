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
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import archiver from 'archiver';
import {
  MediaService,
  BULK_DOWNLOAD_MAX_ITEMS,
  BULK_DOWNLOAD_MAX_BYTES,
} from './media.service.js';
import { UploadMediaDto } from './dto/upload-media.dto.js';
import { QueryMediaDto } from './dto/query-media.dto.js';
import { BulkDownloadDto } from './dto/bulk-download.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
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
   * Bulk download — zip stream nhieu file media thanh 1 ZIP.
   * Admin only. Max 100 items, max 100MB tong size.
   */
  @Post('download/bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async bulkDownload(@Body() dto: BulkDownloadDto, @Res() res: Response) {
    const ids = dto.ids || [];
    if (!ids.length) {
      throw new BadRequestException('ids is required');
    }
    if (ids.length > BULK_DOWNLOAD_MAX_ITEMS) {
      throw new BadRequestException(
        `Max ${BULK_DOWNLOAD_MAX_ITEMS} items per bulk download`,
      );
    }

    const items = await this.mediaService.findByIds(ids);
    if (!items.length) {
      throw new BadRequestException('No media found for given ids');
    }

    // Check total size tong cong truoc khi stream
    const totalSize = items.reduce((sum, m) => sum + (m.size || 0), 0);
    if (totalSize > BULK_DOWNLOAD_MAX_BYTES) {
      throw new BadRequestException(
        `Total size (${totalSize} bytes) exceeds max ${BULK_DOWNLOAD_MAX_BYTES} bytes`,
      );
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `media-bundle-${ts}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Cache-Control': 'no-store',
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      // Log + destroy stream. Response co the da commit headers.
      res.destroy(err);
    });
    archive.pipe(res);

    // Add files. Dung name chong trung — neu trung thi append index.
    const usedNames = new Set<string>();
    for (const media of items) {
      try {
        const buffer = await this.mediaService.getObjectBuffer(
          media.storage_key,
        );
        let name = media.original_name || media.filename;
        if (usedNames.has(name)) {
          const dot = name.lastIndexOf('.');
          const base = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : '';
          name = `${base}-${media.id.slice(-6)}${ext}`;
        }
        usedNames.add(name);
        archive.append(buffer, { name });
      } catch (err) {
        // Log trong archive, skip file bi loi nhung khong fail ca ZIP
        archive.append(
          Buffer.from(
            `Failed to fetch ${media.original_name}: ${(err as Error).message}`,
          ),
          { name: `ERROR-${media.id}.txt` },
        );
      }
    }

    await archive.finalize();
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
   * Xoa 1 media. Chi uploader hoac admin moi duoc xoa.
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    const media = await this.mediaService.findById(id);
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (!isAdmin && (media as any).uploaded_by !== user.id) {
      throw new BadRequestException('Bạn không có quyền xoá file này');
    }
    await this.mediaService.deleteMedia(id);
    return successResponse(null, 'Media deleted successfully');
  }
}
