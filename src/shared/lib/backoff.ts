export interface BackoffOptions {
  attempt: number;
  baseMs?: number;
  maxMs?: number;
  jitterRatio?: number;
  random?: () => number;
}

/**
 * Exponential backoff with full jitter.
 * attempt is 0-based (first retry = 0 → ~baseMs).
 */
export function computeBackoffMs(options: BackoffOptions): number {
  const {
    attempt,
    baseMs = 1000,
    maxMs = 5 * 60 * 1000,
    jitterRatio = 1,
    random = Math.random,
  } = options;

  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  const jitter = exp * jitterRatio * random();
  return Math.floor(Math.min(maxMs, jitter));
}

export function nextAttemptAt(
  attempt: number,
  now: Date = new Date(),
  options?: Omit<BackoffOptions, 'attempt'>,
): string {
  const delay = computeBackoffMs({attempt, ...options});
  return new Date(now.getTime() + delay).toISOString();
}
