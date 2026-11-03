/**
 * Smoke test kept light — navigation native stack needs device mocks.
 * Sync/outbox/conflict coverage lives under src/__tests__.
 */
test('package identity', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('../package.json') as {name: string};
  expect(pkg.name).toBe('CabFloAuditor');
});
