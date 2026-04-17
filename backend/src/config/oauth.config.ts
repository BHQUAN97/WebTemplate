import { registerAs } from '@nestjs/config';

/**
 * OAuth configuration cho Google/Facebook login.
 * Moi provider co the bat/tat rieng qua OAUTH_*_ENABLED.
 * Callback URL phai khop voi cau hinh tren Google Cloud Console /
 * Facebook Developers portal.
 */
export default registerAs('oauth', () => ({
  google: {
    enabled: process.env.OAUTH_GOOGLE_ENABLED === 'true',
    clientId: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.OAUTH_GOOGLE_CALLBACK_URL ||
      'http://localhost:6001/api/auth/google/callback',
  },
  facebook: {
    enabled: process.env.OAUTH_FACEBOOK_ENABLED === 'true',
    clientId: process.env.OAUTH_FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_FACEBOOK_CLIENT_SECRET || '',
    callbackUrl:
      process.env.OAUTH_FACEBOOK_CALLBACK_URL ||
      'http://localhost:6001/api/auth/facebook/callback',
  },
  successRedirect:
    process.env.OAUTH_SUCCESS_REDIRECT ||
    'http://localhost:6000/auth/callback',
  failureRedirect:
    process.env.OAUTH_FAILURE_REDIRECT ||
    'http://localhost:6000/login?error=oauth',
}));
