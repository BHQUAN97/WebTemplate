#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * NestJS module scaffolder for WebTemplate.
 *
 * Usage:
 *   node scripts/generate-module.js <kebab-name>
 *   node scripts/generate-module.js products
 *   node scripts/generate-module.js product-categories
 *
 * Tao cau truc:
 *   backend/src/modules/{name}/
 *     {name}.module.ts
 *     {name}.controller.ts
 *     {name}.service.ts
 *     entities/{singular}.entity.ts
 *     dto/create-{singular}.dto.ts
 *     dto/update-{singular}.dto.ts
 *     dto/query-{name}.dto.ts
 */

'use strict';

const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Convert kebab-case to PascalCase. */
function toPascal(input) {
  return input
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/** Convert kebab-case to camelCase. */
function toCamel(input) {
  const p = toPascal(input);
  return p[0].toLowerCase() + p.slice(1);
}

/**
 * Naive singularizer — xu ly cac hau to pho bien. Khong bao phu 100% tieng Anh
 * nhung du cho ten module: products -> product, categories -> category,
 * boxes -> box, buses -> bus, orders -> order.
 */
function singularize(kebab) {
  const parts = kebab.split('-');
  const last = parts[parts.length - 1];
  let singular = last;

  if (/ies$/i.test(last)) {
    singular = last.replace(/ies$/i, 'y');
  } else if (/(x|s|ch|sh)es$/i.test(last)) {
    singular = last.replace(/es$/i, '');
  } else if (/s$/i.test(last) && !/ss$/i.test(last)) {
    singular = last.replace(/s$/i, '');
  }

  parts[parts.length - 1] = singular;
  return parts.join('-');
}

/** Inverse of singularize — simple plural heuristic. */
function pluralize(kebab) {
  const parts = kebab.split('-');
  const last = parts[parts.length - 1];
  let plural = last;

  if (/y$/i.test(last) && !/[aeiou]y$/i.test(last)) {
    plural = last.replace(/y$/i, 'ies');
  } else if (/(x|s|ch|sh)$/i.test(last)) {
    plural = last + 'es';
  } else if (!/s$/i.test(last)) {
    plural = last + 's';
  }

  parts[parts.length - 1] = plural;
  return parts.join('-');
}

function assertKebab(name) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    console.error(
      `ERROR: module name must be kebab-case (a-z, 0-9, dashes). Got: "${name}"`,
    );
    process.exit(1);
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  + ${path.relative(process.cwd(), filePath).replace(/\\/g, '/')}`);
}

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

function tplEntity({ EntityName, tableName }) {
  return `import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * ${EntityName} entity — TODO: mo ta y nghia business.
 */
@Entity('${tableName}')
@Index(['deleted_at'])
export class ${EntityName} extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // TODO: them cac field khac
}
`;
}

function tplCreateDto({ EntityName }) {
  return `import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * DTO tao moi ${EntityName}.
 */
export class Create${EntityName}Dto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
`;
}

function tplUpdateDto({ EntityName, singularKebab }) {
  return `import { PartialType } from '@nestjs/mapped-types';
import { Create${EntityName}Dto } from './create-${singularKebab}.dto.js';

/**
 * DTO cap nhat ${EntityName} — tat ca fields optional.
 */
export class Update${EntityName}Dto extends PartialType(Create${EntityName}Dto) {}
`;
}

function tplQueryDto({ EntityName }) {
  return `import { PaginationDto } from '../../../common/dto/pagination.dto.js';

/**
 * Query DTO cho list ${EntityName} — ke thua pagination + search.
 * Them custom filter fields tai day neu can.
 */
export class Query${EntityName}Dto extends PaginationDto {}
`;
}

function tplService({ EntityName, EntityNamePlural, singularKebab }) {
  return `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { ${EntityName} } from './entities/${singularKebab}.entity.js';

/**
 * ${EntityNamePlural} service — extends BaseService de co san CRUD + pagination + soft delete.
 */
@Injectable()
export class ${EntityNamePlural}Service extends BaseService<${EntityName}> {
  protected searchableFields = ['name'];

  constructor(
    @InjectRepository(${EntityName})
    private readonly ${toCamel(EntityNamePlural)}Repository: Repository<${EntityName}>,
  ) {
    super(${toCamel(EntityNamePlural)}Repository, '${EntityName}');
  }

  /**
   * Hook cho child service them custom filter vao findAll query.
   */
  protected applyFilters(
    _qb: SelectQueryBuilder<${EntityName}>,
    _options: PaginationDto,
  ): void {
    // BaseService da handle search qua searchableFields.
    // Them custom filters tai day neu can.
  }
}
`;
}

function tplController({
  EntityName,
  EntityNamePlural,
  routeName,
  singularKebab,
  nameKebab,
}) {
  return `import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ${EntityNamePlural}Service } from './${nameKebab}.service.js';
import { Create${EntityName}Dto } from './dto/create-${singularKebab}.dto.js';
import { Update${EntityName}Dto } from './dto/update-${singularKebab}.dto.js';
import { Query${EntityName}Dto } from './dto/query-${nameKebab}.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import { paginatedResponse } from '../../common/utils/response.js';

/**
 * ${EntityNamePlural} controller — CRUD endpoints.
 * NOTE: Neu dung @nestjs/swagger hay them @ApiTags('${routeName}') o day.
 */
@Controller('${routeName}')
export class ${EntityNamePlural}Controller {
  constructor(private readonly ${toCamel(EntityNamePlural)}Service: ${EntityNamePlural}Service) {}

  /**
   * GET /${routeName} — danh sach voi pagination + search.
   */
  @Get()
  async findAll(@Query() query: Query${EntityName}Dto) {
    const { items, meta } = await this.${toCamel(EntityNamePlural)}Service.findAll(query);
    return paginatedResponse(items, meta);
  }

  /**
   * GET /${routeName}/:id — chi tiet mot record.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.${toCamel(EntityNamePlural)}Service.findById(id);
  }

  /**
   * POST /${routeName} — tao moi (admin only).
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: Create${EntityName}Dto) {
    return this.${toCamel(EntityNamePlural)}Service.create(dto as any);
  }

  /**
   * PATCH /${routeName}/:id — cap nhat (admin only).
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: Update${EntityName}Dto) {
    return this.${toCamel(EntityNamePlural)}Service.update(id, dto as any);
  }

  /**
   * DELETE /${routeName}/:id — soft delete (admin only).
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.${toCamel(EntityNamePlural)}Service.softDelete(id);
    return { message: '${EntityName} deleted successfully' };
  }
}
`;
}

function tplModule({ EntityName, EntityNamePlural, singularKebab, nameKebab }) {
  return `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${EntityName} } from './entities/${singularKebab}.entity.js';
import { ${EntityNamePlural}Service } from './${nameKebab}.service.js';
import { ${EntityNamePlural}Controller } from './${nameKebab}.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([${EntityName}])],
  controllers: [${EntityNamePlural}Controller],
  providers: [${EntityNamePlural}Service],
  exports: [${EntityNamePlural}Service],
})
export class ${EntityNamePlural}Module {}
`;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: node scripts/generate-module.js <kebab-name>');
    console.error('Examples:');
    console.error('  node scripts/generate-module.js products');
    console.error('  node scripts/generate-module.js product-categories');
    process.exit(1);
  }

  assertKebab(raw);

  // Tat ca ten suy ra:
  //   nameKebab      -> "products" | "product-categories"      (plural, folder + file prefix)
  //   singularKebab  -> "product"  | "product-category"        (entity file name)
  //   EntityName     -> "Product"  | "ProductCategory"         (class ten entity)
  //   EntityNamePlural -> "Products" | "ProductCategories"     (class ten service/controller/module)
  const nameKebab = pluralize(singularize(raw)); // chuan hoa ve plural
  const singularKebab = singularize(nameKebab);
  const EntityName = toPascal(singularKebab);
  const EntityNamePlural = toPascal(nameKebab);
  const routeName = nameKebab;
  const tableName = nameKebab.replace(/-/g, '_');

  const repoRoot = path.resolve(__dirname, '..');
  const moduleDir = path.join(repoRoot, 'backend', 'src', 'modules', nameKebab);

  if (fs.existsSync(moduleDir)) {
    console.error(`ERROR: module folder already exists: ${moduleDir}`);
    process.exit(1);
  }

  console.log(`Generating module "${nameKebab}" (entity: ${EntityName})`);
  console.log(`Target: ${moduleDir}`);

  const ctx = {
    EntityName,
    EntityNamePlural,
    nameKebab,
    singularKebab,
    routeName,
    tableName,
  };

  writeFile(
    path.join(moduleDir, 'entities', `${singularKebab}.entity.ts`),
    tplEntity(ctx),
  );
  writeFile(
    path.join(moduleDir, 'dto', `create-${singularKebab}.dto.ts`),
    tplCreateDto(ctx),
  );
  writeFile(
    path.join(moduleDir, 'dto', `update-${singularKebab}.dto.ts`),
    tplUpdateDto(ctx),
  );
  writeFile(
    path.join(moduleDir, 'dto', `query-${nameKebab}.dto.ts`),
    tplQueryDto(ctx),
  );
  writeFile(
    path.join(moduleDir, `${nameKebab}.service.ts`),
    tplService(ctx),
  );
  writeFile(
    path.join(moduleDir, `${nameKebab}.controller.ts`),
    tplController(ctx),
  );
  writeFile(
    path.join(moduleDir, `${nameKebab}.module.ts`),
    tplModule(ctx),
  );

  console.log('\nDone. Next steps:');
  console.log(`  1. Add ${EntityNamePlural}Module to app.module.ts imports[]`);
  console.log(
    `     import { ${EntityNamePlural}Module } from './modules/${nameKebab}/${nameKebab}.module.js';`,
  );
  console.log(
    `  2. Run ./scripts/migrate.sh generate Create${EntityNamePlural}Table`,
  );
  console.log(`  3. Apply migration: ./scripts/migrate.sh run`);
}

main();
