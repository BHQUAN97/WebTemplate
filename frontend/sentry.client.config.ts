import * as Sentry from '@sentry/nextjs';

// Chi khoi tao Sentry khi co DSN — tranh loi build khi dev local.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    debug: false,
  });
}
