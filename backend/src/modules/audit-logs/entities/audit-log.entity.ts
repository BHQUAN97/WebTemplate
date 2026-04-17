import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Audit log — ghi lai moi hanh dong mutate (POST/PUT/PATCH/DELETE) trong he thong.
 * Dung cho compliance, debugging va forensic analysis.
 *
 * Tao boi AuditInterceptor hoac goi truc tiep qua AuditLogsService.log().
 *
 * Composite indexes:
 *  - (user_id, created_at) — query "user X activity in last 7 days"
 *  - (resource_type, resource_id, created_at) — query history of 1 resource
 */
@Entity('audit_logs')
@Index(['user_id', 'created_at'])
@Index(['resource_type', 'resource_id', 'created_at'])
export class AuditLog extends BaseEntity {
  /** User thuc hien hanh dong — nullable cho anonymous/system actions */
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  user_id: string | null;

  /** Ten action, vi du: 'user.update', 'order.delete', hoac HTTP verb + path */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  action: string;

  /** Loai resource bi tac dong (entity name), vi du: 'User', 'Order' */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_type: string | null;

  /** ID resource bi tac dong */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_id: string | null;

  /**
   * Thay doi — luu duoi dang JSON string (body request / diff before-after).
   * Dung type `text` thay vi `json` de tuong thich tot voi mysql 5.7+.
   */
  @Column({ type: 'text', nullable: true })
  changes: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;
}
