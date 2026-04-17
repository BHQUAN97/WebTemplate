import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';

/**
 * TypeORM database configuration from environment variables.
 * MySQL on port 6002, database webtemplate.
 */
export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6002', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'webtemplate',
    // Tu dong load tat ca entity
    autoLoadEntities: true,
    // CANH BAO: synchronize chi bat khi CA HAI dieu kien:
    //   1. NODE_ENV === 'development'
    //   2. TYPEORM_SYNC === 'true' (explicit opt-in)
    // Ly do: tranh tu dong drop/alter column gay mat data. Trong moi truong
    // development van khuyen dung migration de dam bao schema dong bo giua dev/prod.
    // Production: BAT BUOC dung migration, khong bao gio synchronize.
    synchronize:
      process.env.NODE_ENV === 'development' &&
      process.env.TYPEORM_SYNC === 'true',
    // Tu dong chay migration khi khoi dong production — dam bao schema luon up-to-date
    migrationsRun: process.env.NODE_ENV === 'production',
    logging: process.env.DB_LOGGING === 'true',
    timezone: '+07:00',
  };
}

/**
 * DataSource cho TypeORM CLI (migration:run / generate / revert).
 * File nay export default cho `typeorm -d dist/config/database.config.js`.
 *
 * Khac biet voi getDatabaseConfig():
 *  - Phai specify entities + migrations paths (autoLoadEntities khong work ngoai Nest).
 *  - Duoc bien dich ra dist/ roi CLI moi su dung.
 */
const cliDataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '6002', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'webtemplate',
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{js,ts}')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{js,ts}')],
  timezone: '+07:00',
};

export default new DataSource(cliDataSourceOptions);
