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

// Missing night: null. The body lands with the reader; the signature is what the page parts import.
export function readNight(runsDir: string, night: string): NightDigest | null {
  void runsDir;
  void night;
  throw new Error('readNight is not implemented');
}
