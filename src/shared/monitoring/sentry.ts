import {getAppConfig} from '../config/env';
import {logger} from '../lib/logger';

/**
 * Sentry-ready stub. Wire @sentry/react-native here when DSN is available.
 * TODO(E2E/Sentry): install @sentry/react-native and call Sentry.init in bootstrap.
 */
export interface ErrorReporter {
  init(): void;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, context?: Record<string, unknown>): void;
  setUser(user: {id: string; email?: string} | null): void;
}

class SentryStub implements ErrorReporter {
  private ready = false;

  init(): void {
    const {sentryDsn, env} = getAppConfig();
    if (!sentryDsn) {
      logger.info('Sentry stub active (no DSN). env=' + env);
      this.ready = true;
      return;
    }
    // TODO: Sentry.init({ dsn: sentryDsn, environment: env })
    logger.info('Sentry DSN present — replace stub with real SDK init');
    this.ready = true;
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    logger.error('captureException', {error, context, ready: this.ready});
  }

  captureMessage(message: string, context?: Record<string, unknown>): void {
    logger.warn('captureMessage', {message, context, ready: this.ready});
  }

  setUser(user: {id: string; email?: string} | null): void {
    logger.debug('setUser', user);
  }
}

export const errorReporter: ErrorReporter = new SentryStub();
