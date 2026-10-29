import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: DigestStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  rows: DigestRow[];
  badLines: number;
};

const STATUSES = new Set<DigestStatus>(['ok', 'retry', 'fail']);
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

type Event = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

function parseLine(line: string): Event | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.at !== 'string' || typeof record.job !== 'string') return null;
  if (typeof record.status !== 'string' || !STATUSES.has(record.status as DigestStatus)) return null;
  if (record.owner !== null && typeof record.owner !== 'string') return null;
  if (record.error !== undefined && typeof record.error !== 'string') return null;
  return {
    at: record.at,
    job: record.job,
    status: record.status as DigestStatus,
    owner: record.owner,
    ...(typeof record.error === 'string' ? { error: record.error } : {}),
  };
}

// Missing file, or a night that is not YYYY-MM-DD: null. A bad line is counted, never thrown.
export function readNight(runsDir: string, night: string): NightDigest | null {
  if (!NIGHT.test(night)) return null;
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return null;

  const byJob = new Map<string, Event[]>();
  let badLines = 0;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const event = parseLine(line);
    if (!event) {
      badLines += 1;
      continue;
    }
    const list = byJob.get(event.job);
    if (list) list.push(event);
    else byJob.set(event.job, [event]);
  }

  const rows: DigestRow[] = [...byJob.entries()].map(([job, events]) => {
    const ordered = [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    return {
      job,
      owner: last.owner,
      runs: ordered.length,
      retries: ordered.filter((event) => event.status === 'retry').length,
      lastStatus: last.status,
      lastError: last.error ?? null,
      firstAt: first.at,
      lastAt: last.at,
    };
  });
  rows.sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { rows, badLines };
}

export function statusCounts(rows: DigestRow[]): Record<DigestStatus, number> {
  return {
    ok: rows.filter((row) => row.lastStatus === 'ok').length,
    retry: rows.filter((row) => row.lastStatus === 'retry').length,
    fail: rows.filter((row) => row.lastStatus === 'fail').length,
  };
}
