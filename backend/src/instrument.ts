/**
 * Sentry instrumentation.
 * PHAI import o dong DAU TIEN cua main.ts de Sentry hook vao runtime truoc cac module khac.
 *
 * Chi init neu bien moi truong SENTRY_DSN ton tai — de local dev khong gui error.
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    // Profiling — giu thap o production de khong ton performance
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0.1),
    integrations: [nodeProfilingIntegration()],
  });
}
