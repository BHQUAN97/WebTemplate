import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Inventory } from '../inventory/entities/inventory.entity.js';
import { User } from '../users/entities/user.entity.js';
import { OrderStatus } from '../../common/constants/index.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import {
  ReportPayload,
  ReportSummaryCard,
  ReportTable,
  ReportType,
} from './report.types.js';
import { generateReportCsv } from './generators/csv.generator.js';
import { generateReportPdf } from './generators/pdf.generator.js';
import { generateReportXlsx } from './generators/xlsx.generator.js';

/**
 * Max range cho phep query 1 lan: 365 ngay (default backward-compat).
 */
const MAX_RANGE_DAYS = 365;

/**
 * Cap cung cho so order load tu DB trong 1 lan goi getSalesReport.
 * Bao ve khoi OOM khi tenant co ~1M orders trong khoang.
 */
const MAX_ORDERS_PER_REPORT = 100000;

/**
 * Cap range ngay cho 1 report: 1 nam + 1 ngay leap-safe.
 * Date range cao hon nay -> tu choi som de tranh full table scan.
 */
const MAX_DATE_RANGE_DAYS = 366;

/**
 * ReportsService — aggregate du lieu tu Orders/Products/Users/Inventory
 * va render ra PDF/XLSX/CSV buffer.
 *
 * Hau het logic aggregate dung TypeORM query builder de on dinh voi MySQL.
 * Neu cac module khac thay doi entity, report van chay nhung co the tra ve 0.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ======================================================================
  // Public orchestrator: compose report + render format
  // ======================================================================

  /**
   * Build + render 1 report. Tra ve { buffer, mimeType, filename }.
   * tenantId neu truyen vao se filter du lieu trong tenant do (multi-tenant).
   */
  async generate(
    type: ReportType,
    query: ReportQueryDto,
    tenantId?: string | null,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const { dateFrom, dateTo } = this.validateRange(query);
    const format = query.format ?? 'xlsx';

    let payload: ReportPayload;
    switch (type) {
      case 'sales':
        payload = await this.getSalesReport({ dateFrom, dateTo, tenantId });
        break;
      case 'products':
        payload = await this.getProductsReport({ dateFrom, dateTo, tenantId });
        break;
      case 'customers':
        payload = await this.getCustomersReport({ dateFrom, dateTo, tenantId });
        break;
      case 'inventory':
        payload = await this.getInventoryReport({ dateFrom, dateTo, tenantId });
        break;
      default:
        throw new BadRequestException(`Unknown report type: ${type}`);
    }

    const ts = new Date().toISOString().slice(0, 10);
    const baseName = `${type}-report-${ts}`;

    if (format === 'csv') {
      return {
        buffer: generateReportCsv(payload),
        mimeType: 'text/csv; charset=utf-8',
        filename: `${baseName}.csv`,
      };
    }
    if (format === 'pdf') {
      const buffer = await generateReportPdf(payload);
      return {
        buffer,
        mimeType: 'application/pdf',
        filename: `${baseName}.pdf`,
      };
    }
    // default xlsx
    const buffer = await generateReportXlsx(payload);
    return {
      buffer,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${baseName}.xlsx`,
    };
  }

  /**
   * Shortcut: gen sales report PDF ra Buffer — cron/background dung de
   * dinh kem email. Tra ve Buffer truc tiep, khong kem filename.
   * tenantId neu truyen vao -> filter rieng cho tenant do.
   */
  async generateSalesPdf(query: {
    dateFrom: Date | string;
    dateTo: Date | string;
    tenantId?: string | null;
  }): Promise<Buffer> {
    const dateFrom =
      query.dateFrom instanceof Date
        ? query.dateFrom.toISOString()
        : query.dateFrom;
    const dateTo =
      query.dateTo instanceof Date ? query.dateTo.toISOString() : query.dateTo;
    const payload = await this.getSalesReport({
      dateFrom,
      dateTo,
      tenantId: query.tenantId ?? null,
    });
    return generateReportPdf(payload);
  }

  /**
   * Shortcut: gen sales report XLSX ra Buffer — tien dung cho cron gui attachment.
   * tenantId neu truyen vao -> filter rieng cho tenant do.
   */
  async generateSalesXlsx(query: {
    dateFrom: Date | string;
    dateTo: Date | string;
    tenantId?: string | null;
  }): Promise<Buffer> {
    const dateFrom =
      query.dateFrom instanceof Date
        ? query.dateFrom.toISOString()
        : query.dateFrom;
    const dateTo =
      query.dateTo instanceof Date ? query.dateTo.toISOString() : query.dateTo;
    const payload = await this.getSalesReport({
      dateFrom,
      dateTo,
      tenantId: query.tenantId ?? null,
    });
    return generateReportXlsx(payload);
  }

  // ======================================================================
  // Report builders — compose ReportPayload (du lieu cho generators)
  // ======================================================================

  /**
   * Sales report — aggregate tu Orders.
   * Summary: total orders, revenue, AOV.
   * Tables: daily breakdown, top 10 products.
   *
   * Cap an toan:
   *  - dateRange max MAX_DATE_RANGE_DAYS (1 nam + 1) -> tu choi neu vuot.
   *  - getMany() bi cap MAX_ORDERS_PER_REPORT -> tranh OOM neu tenant
   *    co ~1M orders. Hit cap se log warning.
   *
   * tenantId (optional): neu truyen vao -> filter o.tenant_id = :tenantId,
   * dam bao multi-tenant data isolation. Pass null/undefined de aggregate toan he thong.
   */
  async getSalesReport(args: {
    dateFrom: string | null;
    dateTo: string | null;
    tenantId?: string | null;
  }): Promise<ReportPayload> {
    const { dateFrom, dateTo, tenantId } = args;

    // Validate range cung cho method nay (caller co the bypass validateRange)
    if (dateFrom && dateTo) {
      const fromMs = new Date(dateFrom).getTime();
      const toMs = new Date(dateTo).getTime();
      if (
        !isNaN(fromMs) &&
        !isNaN(toMs) &&
        toMs - fromMs > MAX_DATE_RANGE_DAYS * 86400000
      ) {
        throw new BadRequestException(
          `Date range exceeds max ${MAX_DATE_RANGE_DAYS} days for sales report`,
        );
      }
    }

    const orderQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.deleted_at IS NULL')
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED });

    if (dateFrom) orderQb.andWhere('o.created_at >= :dateFrom', { dateFrom });
    if (dateTo) orderQb.andWhere('o.created_at <= :dateTo', { dateTo });
    if (tenantId) orderQb.andWhere('o.tenant_id = :tenantId', { tenantId });

    // Cap so order load mot lan -> tranh OOM
    orderQb.take(MAX_ORDERS_PER_REPORT);

    const orders = await orderQb.getMany();

    if (orders.length >= MAX_ORDERS_PER_REPORT) {
      this.logger.warn(
        `getSalesReport hit cap MAX_ORDERS_PER_REPORT=${MAX_ORDERS_PER_REPORT} ` +
          `(tenantId=${tenantId ?? 'all'}, range=${dateFrom ?? '-'}..${dateTo ?? '-'}). ` +
          `Report sai lech — hay thu hep date range hoac chia nho theo tenant.`,
      );
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.total || 0),
      0,
    );
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Daily breakdown (YYYY-MM-DD -> count/revenue)
    const byDay = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      const day = new Date(o.created_at).toISOString().slice(0, 10);
      const cur = byDay.get(day) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(o.total || 0);
      byDay.set(day, cur);
    }

    const dailyRows = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, v]) => ({
        date: day,
        orders: v.count,
        revenue: this.formatCurrency(v.revenue),
      }));

    // Top products from OrderItem
    const topProducts = await this.getTopProducts(
      dateFrom,
      dateTo,
      10,
      tenantId,
    );

    const summary: ReportSummaryCard[] = [
      { label: 'Total orders', value: totalOrders },
      { label: 'Total revenue', value: this.formatCurrency(totalRevenue) },
      { label: 'Avg order value', value: this.formatCurrency(aov) },
    ];

    const tables: ReportTable[] = [
      {
        title: 'Daily breakdown',
        columns: [
          { key: 'date', header: 'Date', width: 14 },
          { key: 'orders', header: 'Orders', width: 12, align: 'right' },
          { key: 'revenue', header: 'Revenue', width: 20, align: 'right' },
        ],
        rows: dailyRows,
      },
      {
        title: 'Top 10 products',
        columns: [
          { key: 'name', header: 'Product', width: 40 },
          { key: 'sku', header: 'SKU', width: 14 },
          { key: 'units', header: 'Units', width: 10, align: 'right' },
          { key: 'revenue', header: 'Revenue', width: 18, align: 'right' },
        ],
        rows: topProducts,
      },
    ];

    return {
      title: 'Sales Report',
      range: { from: dateFrom, to: dateTo },
      summary,
      tables,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Products report — top sellers + low stock + total SKUs.
   * tenantId neu truyen vao -> filter theo tenant cho top sellers (tinh qua orders).
   */
  async getProductsReport(args: {
    dateFrom: string | null;
    dateTo: string | null;
    tenantId?: string | null;
  }): Promise<ReportPayload> {
    const { dateFrom, dateTo, tenantId } = args;

    const totalSkus = await this.productRepo.count({
      where: { deleted_at: null as any },
    });

    const lowStock = await this.inventoryRepo
      .createQueryBuilder('inv')
      .where('inv.deleted_at IS NULL')
      .andWhere('inv.track_inventory = :t', { t: true })
      .andWhere('inv.quantity <= inv.low_stock_threshold')
      .getMany();

    const topSellers = await this.getTopProducts(
      dateFrom,
      dateTo,
      20,
      tenantId,
    );

    // Lay product detail cho low stock items
    const productIds = lowStock
      .map((i) => i.product_id)
      .filter((id): id is string => !!id);
    const productMap = new Map<string, { name: string; sku: string | null }>();
    if (productIds.length > 0) {
      const products = await this.productRepo
        .createQueryBuilder('p')
        .where('p.id IN (:...ids)', { ids: productIds })
        .getMany();
      for (const p of products) {
        productMap.set(p.id, { name: p.name, sku: p.sku });
      }
    }

    const lowStockRows = lowStock.map((inv) => {
      const prod = inv.product_id ? productMap.get(inv.product_id) : undefined;
      return {
        name: prod?.name ?? '(unknown)',
        sku: prod?.sku ?? '-',
        quantity: inv.quantity,
        threshold: inv.low_stock_threshold,
      };
    });

    const summary: ReportSummaryCard[] = [
      { label: 'Total SKUs', value: totalSkus },
      { label: 'Low-stock items', value: lowStock.length },
      { label: 'Top sellers listed', value: topSellers.length },
    ];

    const tables: ReportTable[] = [
      {
        title: 'Top selling products',
        columns: [
          { key: 'name', header: 'Product', width: 40 },
          { key: 'sku', header: 'SKU', width: 14 },
          { key: 'units', header: 'Units sold', width: 12, align: 'right' },
          { key: 'revenue', header: 'Revenue', width: 18, align: 'right' },
        ],
        rows: topSellers,
      },
      {
        title: 'Low-stock warnings',
        columns: [
          { key: 'name', header: 'Product', width: 36 },
          { key: 'sku', header: 'SKU', width: 14 },
          {
            key: 'quantity',
            header: 'Qty',
            width: 10,
            align: 'right',
            highlightLow: true,
          },
          { key: 'threshold', header: 'Threshold', width: 12, align: 'right' },
        ],
        rows: lowStockRows,
      },
    ];

    return {
      title: 'Products Report',
      range: { from: dateFrom, to: dateTo },
      summary,
      tables,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Customers report — new signups, active, top spenders.
   * tenantId neu truyen vao -> filter Users + Orders theo tenant.
   */
  async getCustomersReport(args: {
    dateFrom: string | null;
    dateTo: string | null;
    tenantId?: string | null;
  }): Promise<ReportPayload> {
    const { dateFrom, dateTo, tenantId } = args;

    const newUsersQb = this.userRepo
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL');
    if (dateFrom)
      newUsersQb.andWhere('u.created_at >= :dateFrom', { dateFrom });
    if (dateTo) newUsersQb.andWhere('u.created_at <= :dateTo', { dateTo });
    if (tenantId) newUsersQb.andWhere('u.tenant_id = :tenantId', { tenantId });
    const newUsers = await newUsersQb.getCount();

    const totalUsersQb = this.userRepo
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL');
    if (tenantId)
      totalUsersQb.andWhere('u.tenant_id = :tenantId', { tenantId });
    const totalUsers = await totalUsersQb.getCount();

    // Active users — co order trong khoang
    const activeQb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.user_id', 'user_id')
      .where('o.deleted_at IS NULL');
    if (dateFrom) activeQb.andWhere('o.created_at >= :dateFrom', { dateFrom });
    if (dateTo) activeQb.andWhere('o.created_at <= :dateTo', { dateTo });
    if (tenantId) activeQb.andWhere('o.tenant_id = :tenantId', { tenantId });
    activeQb.groupBy('o.user_id');

    const activeRaw = await activeQb.getRawMany<{ user_id: string }>();
    const activeUserIds = activeRaw.map((r) => r.user_id).filter(Boolean);

    // Top spenders: aggregate order total theo user
    const topSpendersQb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.user_id', 'user_id')
      .addSelect('COUNT(o.id)', 'orders_count')
      .addSelect('SUM(o.total)', 'total_spent')
      .where('o.deleted_at IS NULL')
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED });
    if (dateFrom)
      topSpendersQb.andWhere('o.created_at >= :dateFrom', { dateFrom });
    if (dateTo) topSpendersQb.andWhere('o.created_at <= :dateTo', { dateTo });
    if (tenantId)
      topSpendersQb.andWhere('o.tenant_id = :tenantId', { tenantId });
    topSpendersQb.groupBy('o.user_id').orderBy('total_spent', 'DESC').limit(20);

    const topSpendersRaw = await topSpendersQb.getRawMany<{
      user_id: string;
      orders_count: string;
      total_spent: string;
    }>();

    // Lay email/name de hien thi
    const ids = topSpendersRaw.map((r) => r.user_id).filter(Boolean);
    const userMap = new Map<string, { email: string; name: string }>();
    if (ids.length > 0) {
      const users = await this.userRepo
        .createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids })
        .getMany();
      for (const u of users)
        userMap.set(u.id, { email: u.email, name: u.name });
    }

    const topSpenders = topSpendersRaw.map((r) => ({
      name: userMap.get(r.user_id)?.name ?? '-',
      email: userMap.get(r.user_id)?.email ?? '-',
      orders: Number(r.orders_count),
      total: this.formatCurrency(Number(r.total_spent || 0)),
    }));

    const summary: ReportSummaryCard[] = [
      { label: 'Total customers', value: totalUsers },
      { label: 'New in period', value: newUsers },
      { label: 'Active buyers', value: activeUserIds.length },
    ];

    const tables: ReportTable[] = [
      {
        title: 'Top 20 spenders',
        columns: [
          { key: 'name', header: 'Name', width: 28 },
          { key: 'email', header: 'Email', width: 36 },
          { key: 'orders', header: 'Orders', width: 10, align: 'right' },
          { key: 'total', header: 'Spent', width: 18, align: 'right' },
        ],
        rows: topSpenders,
      },
    ];

    return {
      title: 'Customers Report',
      range: { from: dateFrom, to: dateTo },
      summary,
      tables,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Inventory report — current stock, low-stock warnings, value on-hand.
   * Bo qua dateRange — inventory la snapshot hien tai.
   * tenantId hien tai accept de ket qua API consistent — Inventory entity
   * chua co tenant_id column nen filter chi ap dung khi entity bo sung sau.
   */
  async getInventoryReport(args: {
    dateFrom: string | null;
    dateTo: string | null;
    tenantId?: string | null;
  }): Promise<ReportPayload> {
    const { dateFrom, dateTo } = args;
    // tenantId chua duoc dung — Inventory chua co tenant_id column.
    // Khi entity bo sung, them filter o day.
    void args.tenantId;

    const items = await this.inventoryRepo
      .createQueryBuilder('inv')
      .where('inv.deleted_at IS NULL')
      .andWhere('inv.track_inventory = :t', { t: true })
      .getMany();

    const productIds = items
      .map((i) => i.product_id)
      .filter((id): id is string => !!id);
    const productMap = new Map<
      string,
      { name: string; sku: string | null; cost: number; price: number }
    >();
    if (productIds.length > 0) {
      const products = await this.productRepo
        .createQueryBuilder('p')
        .where('p.id IN (:...ids)', { ids: productIds })
        .getMany();
      for (const p of products) {
        productMap.set(p.id, {
          name: p.name,
          sku: p.sku,
          cost: Number(p.cost_price || 0),
          price: Number(p.price || 0),
        });
      }
    }

    let totalValue = 0;
    let lowStockCount = 0;
    let totalQuantity = 0;

    const rows = items.map((inv) => {
      const prod = inv.product_id ? productMap.get(inv.product_id) : undefined;
      const qty = inv.quantity;
      const cost = prod?.cost ?? prod?.price ?? 0;
      const value = qty * cost;
      totalValue += value;
      totalQuantity += qty;
      if (qty <= inv.low_stock_threshold) lowStockCount += 1;
      return {
        name: prod?.name ?? '-',
        sku: prod?.sku ?? '-',
        quantity: qty,
        reserved: inv.reserved,
        threshold: inv.low_stock_threshold,
        unit_cost: this.formatCurrency(cost),
        value: this.formatCurrency(value),
      };
    });

    const summary: ReportSummaryCard[] = [
      { label: 'SKUs tracked', value: items.length },
      { label: 'Units on hand', value: totalQuantity },
      { label: 'Low-stock items', value: lowStockCount },
      { label: 'Value on hand', value: this.formatCurrency(totalValue) },
    ];

    const tables: ReportTable[] = [
      {
        title: 'Inventory snapshot',
        columns: [
          { key: 'name', header: 'Product', width: 34 },
          { key: 'sku', header: 'SKU', width: 14 },
          {
            key: 'quantity',
            header: 'On hand',
            width: 10,
            align: 'right',
            highlightLow: true,
          },
          { key: 'reserved', header: 'Reserved', width: 10, align: 'right' },
          { key: 'threshold', header: 'Threshold', width: 12, align: 'right' },
          { key: 'unit_cost', header: 'Unit cost', width: 14, align: 'right' },
          { key: 'value', header: 'Value', width: 16, align: 'right' },
        ],
        rows,
      },
    ];

    return {
      title: 'Inventory Report',
      range: { from: dateFrom, to: dateTo },
      summary,
      tables,
      generatedAt: new Date().toISOString(),
    };
  }

  // ======================================================================
  // Helpers
  // ======================================================================

  /**
   * Tinh top N san pham ban chay — join OrderItem + Order theo ngay.
   * tenantId neu truyen vao -> filter o.tenant_id (multi-tenant isolation).
   */
  private async getTopProducts(
    dateFrom: string | null,
    dateTo: string | null,
    limit: number,
    tenantId?: string | null,
  ): Promise<
    Array<{ name: string; sku: string; units: number; revenue: string }>
  > {
    const qb = this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin(Order, 'o', 'o.id = oi.order_id')
      .select('oi.product_id', 'product_id')
      .addSelect('MAX(oi.product_name)', 'product_name')
      .addSelect('MAX(oi.sku)', 'sku')
      .addSelect('SUM(oi.quantity)', 'units')
      .addSelect('SUM(oi.total)', 'revenue')
      .where('o.deleted_at IS NULL')
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED });

    if (dateFrom) qb.andWhere('o.created_at >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('o.created_at <= :dateTo', { dateTo });
    if (tenantId) qb.andWhere('o.tenant_id = :tenantId', { tenantId });

    qb.groupBy('oi.product_id').orderBy('revenue', 'DESC').limit(limit);

    const raw = await qb.getRawMany<{
      product_id: string;
      product_name: string;
      sku: string | null;
      units: string;
      revenue: string;
    }>();

    return raw.map((r) => ({
      name: r.product_name ?? '-',
      sku: r.sku ?? '-',
      units: Number(r.units || 0),
      revenue: this.formatCurrency(Number(r.revenue || 0)),
    }));
  }

  /**
   * Validate date range + tra ve `{ dateFrom, dateTo }` da normalize.
   * Throw neu dateFrom > dateTo hoac range > MAX_RANGE_DAYS ngay.
   */
  private validateRange(query: ReportQueryDto): {
    dateFrom: string | null;
    dateTo: string | null;
  } {
    const dateFrom = query.dateFrom ?? null;
    const dateTo = query.dateTo ?? null;

    if (dateFrom && dateTo) {
      const from = new Date(dateFrom).getTime();
      const to = new Date(dateTo).getTime();
      if (isNaN(from) || isNaN(to)) {
        throw new BadRequestException('Invalid date format');
      }
      if (from > to) {
        throw new BadRequestException('dateFrom must be before dateTo');
      }
      const days = (to - from) / (24 * 60 * 60 * 1000);
      if (days > MAX_RANGE_DAYS) {
        throw new BadRequestException(
          `Date range exceeds max ${MAX_RANGE_DAYS} days`,
        );
      }
    }

    return { dateFrom, dateTo };
  }

  /**
   * Public helper de check date range theo cap MAX_DATE_RANGE_DAYS — caller
   * (cron / API ngoai) co the dung de fail-fast truoc khi goi getSalesReport.
   */
  static readonly MAX_DATE_RANGE_DAYS = MAX_DATE_RANGE_DAYS;
  static readonly MAX_ORDERS_PER_REPORT = MAX_ORDERS_PER_REPORT;

  /**
   * Format tien VND — khong dung Intl de tranh locale khac nhau giua OS.
   */
  private formatCurrency(value: number): string {
    const rounded = Math.round(Number(value) || 0);
    return `${rounded.toLocaleString('en-US')} VND`;
  }
}
