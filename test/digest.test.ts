import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('readNight', () => {
  it('reads 2026-10-28 as 5 jobs and 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    expect(digest!.badLines).toBe(1);
    expect(digest!.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const refresh = digest!.rows.find((row) => row.job === 'fixtures/refresh');
    expect(refresh).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', owner: 'rook', lastError: null });

    const backup = digest!.rows.find((row) => row.job === 'notes/backup');
    expect(backup).toMatchObject({
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      owner: 'lane-07',
    });

    const render = digest!.rows.find((row) => row.job === 'digest/render');
    expect(render?.owner).toBeNull();
  });
});
