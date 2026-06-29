import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO để user cập nhật notification preferences.
 * Tất cả fields đều optional — chỉ merge với prefs hiện có.
 */
export class UpdatePreferencesDto {
  /** Nhận email thông báo (đơn hàng, tài khoản) */
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  /** Nhận push notification trên thiết bị */
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  /** Nhận email marketing và khuyến mãi */
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  /** Nhận thông báo cập nhật đơn hàng */
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  /** Nhận cảnh báo bảo mật (đăng nhập thiết bị mới, đổi mật khẩu) */
  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;
}
