import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { ExportDto, ExportFormat, ExportEntityType } from './dto/export.dto.js';

/**
 * Ket qua import — so luong thanh cong va loi chi tiet.
 */
export interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

/**
 * Export/Import service — xuat/nhap du lieu CSV/XLSX cho cac entity.
 * Su dung package xlsx de doc/ghi file.
 *
 * SECURITY: tableName dung whitelist cung; column names luon filter theo
 * SHOW COLUMNS truoc khi noi vao SQL (chong SQL Injection).
 */
@Injectable()
export class ExportImportService {
  private readonly logger = new Logger('ExportImportService');

  /**
   * Mapping entity_type -> table name trong DB (whitelist cung).
   */
  private readonly tableMap: Record<ExportEntityType, string> = {
    [ExportEntityType.PRODUCTS]: 'products',
    [ExportEntityType.ORDERS]: 'orders',
    [ExportEntityType.USERS]: 'users',
    [ExportEntityType.ARTICLES]: 'articles',
  };

  /**
   * Regex cho identifier an toan — chi cho phep chu cai, so, dau gach duoi.
   */
  private readonly identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lay whitelist column names tu DB schema. Chi dung voi tableName da qua whitelist.
   */
  private async getColumnWhitelist(tableName: string): Promise<Set<string>> {
    if (!this.identifierRegex.test(tableName)) {
      throw new BadRequestException('Invalid table name');
    }
    // tableName da kiem tra regex + whitelist nen an toan de noi vao backtick
    const columns = await this.dataSource.query(
      `SHOW COLUMNS FROM \`${tableName}\``,
    );
    return new Set(columns.map((c: any) => c.Field));
  }

  /**
   * Export du lieu thanh file CSV hoac XLSX.
   * Tra ve Buffer de controller gui ve client.
   */
  async export(dto: ExportDto, userId: string): Promise<Buffer> {
    const tableName = this.tableMap[dto.entity_type];
    if (!tableName) {
      throw new BadRequestException(`Unknown entity type: ${dto.entity_type}`);
    }

    // Lay whitelist columns de filter filter-keys
    const columnWhitelist = await this.getColumnWhitelist(tableName);

    // Query du lieu tu DB (bo qua soft-deleted) — tableName tu whitelist
    let query = `SELECT * FROM \`${tableName}\` WHERE deleted_at IS NULL`;

    // Ap dung filters — chi chap nhan key thuoc whitelist columns
    const params: any[] = [];
    if (dto.filters) {
      for (const [key, value] of Object.entries(dto.filters)) {
        if (!this.identifierRegex.test(key) || !columnWhitelist.has(key)) {
          this.logger.warn(`Bo qua filter key khong hop le: ${key}`);
          continue;
        }
        // key da qua whitelist + regex => an toan de noi vao SQL
        query += ` AND \`${key}\` = ?`;
        params.push(value);
      }
    }

    const rows = await this.dataSource.query(query, params);

    if (rows.length === 0) {
      throw new BadRequestException('No data to export');
    }

    this.logger.log(
      `Export ${dto.entity_type}: ${rows.length} rows by user ${userId}`,
    );

    // Tao workbook tu du lieu
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, dto.entity_type);

    // Xuat theo format
    if (dto.format === ExportFormat.CSV) {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return Buffer.from(csv, 'utf-8');
    }

    // XLSX
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
    return Buffer.from(buffer);
  }

  /**
   * Import du lieu tu file CSV/XLSX.
   * Parse file, validate tung dong, insert/update vao DB.
   */
  async import(
    entityType: ExportEntityType,
    file: Express.Multer.File,
    userId: string,
  ): Promise<ImportResult> {
    const tableName = this.tableMap[entityType];
    if (!tableName) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    // Doc file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      throw new BadRequestException('File is empty');
    }

    this.logger.log(
      `Import ${entityType}: ${rows.length} rows by user ${userId}`,
    );

    let success = 0;
    const errors: { row: number; message: string }[] = [];

    // Lay whitelist columns tu DB schema
    const columnWhitelist = await this.getColumnWhitelist(tableName);

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        // Loc chi giu cac field hop le (whitelist column + regex + loai id/deleted_at)
        const validData: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (
            this.identifierRegex.test(key) &&
            columnWhitelist.has(key) &&
            key !== 'id' &&
            key !== 'deleted_at'
          ) {
            validData[key] = value;
          }
        }

        if (Object.keys(validData).length === 0) {
          errors.push({ row: i + 2, message: 'No valid columns found' });
          continue;
        }

        // Insert vao DB — keys da filter qua whitelist, safe de backtick-quote
        const keys = Object.keys(validData);
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(validData);
        const quotedKeys = keys.map((k) => `\`${k}\``).join(', ');

        await this.dataSource.query(
          `INSERT INTO \`${tableName}\` (${quotedKeys}) VALUES (${placeholders})`,
          values,
        );

        success++;
      } catch (error: any) {
        errors.push({ row: i + 2, message: error.message });
      }
    }

    return { success, errors };
  }
}
