import { registerAs } from '@nestjs/config';

/**
 * App-level configuration: port, name, URLs, environment.
 */
export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '6001', 10),
  name: process.env.APP_NAME || 'WebTemplate',
  url: process.env.APP_URL || 'http://localhost:6000',
  apiUrl: process.env.API_URL || 'http://localhost:6001',
  env: process.env.NODE_ENV || 'development',
}));
