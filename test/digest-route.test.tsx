import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

function tempRuns(): string {
  return mkdtempSync(join(tmpdir(), 'rig-digest-'));
}

describe('digest routes', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('renders 2026-10-28 and returns the same jobs from JSON, in the same order', async () => {
    const runsDir = tempRuns();
    dirs.push(runsDir);
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), readFileSync('runs/2026-10-28.jsonl'));
    const app = createApp({ ...base, runsDir });

    const page = await app.request('/digest/2026-10-28');
    const html = await page.text();
    const json = await (await app.request('/api/digest/2026-10-28')).json() as NightDigest;

    expect(page.status).toBe(200);
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('class="warn"');
    expect(html).toContain('—');
    expect(json.badLines).toBe(1);
    expect(json.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    let at = 0;
    for (const job of json.rows.map((row) => row.job)) {
      const found = html.indexOf(job, at);
      expect(found).toBeGreaterThan(-1);
      at = found + job.length;
    }
  });

  it('returns 404 when the night has no file', async () => {
    const runsDir = tempRuns();
    dirs.push(runsDir);
    const res = await createApp({ ...base, runsDir }).request('/digest/2026-01-01');
    expect(res.status).toBe(404);
    const api = await createApp({ ...base, runsDir }).request('/api/digest/2026-01-01');
    expect(api.status).toBe(404);
  });

  it('renders nothing ran for an empty file', async () => {
    const runsDir = tempRuns();
    dirs.push(runsDir);
    writeFileSync(join(runsDir, '2026-01-02.jsonl'), '');
    const res = await createApp({ ...base, runsDir }).request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('renders a night that contains a bad line', async () => {
    const runsDir = tempRuns();
    dirs.push(runsDir);
    writeFileSync(
      join(runsDir, '2026-01-03.jsonl'),
      '{"at":"2026-01-03T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}\nnot json\n',
    );
    const app = createApp({ ...base, runsDir });
    const page = await app.request('/digest/2026-01-03');
    const api = await app.request('/api/digest/2026-01-03');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('lane/sync');
    expect(((await api.json()) as NightDigest).badLines).toBe(1);
  });

  it('links both nights on disk to a digest', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp({ ...base, runsDir: 'runs' }).request('/');
    const html = await res.text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('ok /');
    const digest = await createApp({ ...base, runsDir: 'runs' }).request('/digest/2026-10-27');
    expect(digest.status).toBe(200);
  });
});
