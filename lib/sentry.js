import * as Sentry from '@sentry/node';

// Initialize Sentry only if DSN is provided
if (!Sentry.getCurrentHub().getClient() && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0, // adjust if you add performance later
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE || undefined,
    enabled: Boolean(process.env.SENTRY_DSN),
    autoSessionTracking: false,
  });
}

function safeBodyKeys(body) {
  try {
    if (!body || typeof body !== 'object') return [];
    return Object.keys(body).slice(0, 30);
  } catch {
    return [];
  }
}

export function withApiBreadcrumbs(handler) {
  return async function sentryWrappedHandler(req, res) {
    const hasSentry = Boolean(Sentry.getCurrentHub().getClient());

    if (hasSentry) {
      Sentry.addBreadcrumb({
        category: 'api',
        level: 'info',
        message: `${req.method || 'UNKNOWN'} ${req.url || ''}`.trim(),
        data: {
          method: req.method,
          url: req.url,
          query: req.query,
          bodyKeys: safeBodyKeys(req.body),
          headers: {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
          },
        },
      });
    }

    try {
      const result = await handler(req, res);

      if (hasSentry) {
        Sentry.addBreadcrumb({
          category: 'api',
          level: res.statusCode >= 400 ? 'warning' : 'info',
          message: 'response',
          data: { statusCode: res.statusCode },
        });
      }

      return result;
    } catch (error) {
      if (hasSentry) {
        Sentry.captureException(error, (scope) => {
          scope.setLevel('error');
          scope.setContext('request', {
            method: req.method,
            url: req.url,
            query: req.query,
            bodyKeys: safeBodyKeys(req.body),
          });
          return scope;
        });
      }
      throw error;
    }
  };
}

export { Sentry };
