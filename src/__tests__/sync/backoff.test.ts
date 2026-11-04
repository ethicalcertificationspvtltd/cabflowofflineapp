import {computeBackoffMs, nextAttemptAt} from '../../shared/lib/backoff';

describe('computeBackoffMs', () => {
  it('grows exponentially and respects max', () => {
    const random = () => 1; // full jitter at ceiling of exp window
    const a0 = computeBackoffMs({attempt: 0, baseMs: 1000, random});
    const a3 = computeBackoffMs({attempt: 3, baseMs: 1000, random});
    const a20 = computeBackoffMs({
      attempt: 20,
      baseMs: 1000,
      maxMs: 10_000,
      random,
    });
    expect(a0).toBe(1000);
    expect(a3).toBe(8000);
    expect(a20).toBe(10_000);
  });

  it('applies jitter below the exponential ceiling', () => {
    const low = computeBackoffMs({
      attempt: 2,
      baseMs: 1000,
      random: () => 0,
    });
    expect(low).toBe(0);
  });

  it('nextAttemptAt is in the future', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const next = nextAttemptAt(1, now, {baseMs: 1000, random: () => 1});
    expect(new Date(next).getTime()).toBeGreaterThan(now.getTime());
  });
});
