import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

// Plugin next-intl — tro den file request config
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Standalone output cho Docker deploy
  output: 'standalone',

  // Allowed image domains — chi cho phep CDN tin cay (chong SSRF + tranh proxy abuse).
  // Override via env IMAGE_HOSTS (comma-separated) cho prod custom CDN.
  images: {
    remotePatterns: [
      // Cloudflare R2 / S3 default
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      // Common social/profile avatars
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      // Local dev backend
      { protocol: 'http', hostname: 'localhost' },
      ...((process.env.IMAGE_HOSTS || '')
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean)
        .map((hostname) => ({ protocol: 'https' as const, hostname }))),
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001/api',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

// Sentry build-time config — chi upload source map khi co auth token.
const sentryBuildOptions = {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
};

// Chi wrap withSentryConfig khi co DSN — tranh warning khi dev local.
const baseConfig = withNextIntl(nextConfig);

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(baseConfig, sentryBuildOptions)
  : baseConfig;
