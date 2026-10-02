import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireRunLock, isProcessRunning } from '../runLock';

let dir: string;
let file: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ma-import-lock-'));
  file = join(dir, '_cache', 'fetch.lock');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const at = () => new Date('2026-09-29T12:00:00.000Z');

describe('the fetch lock', () => {
  it('is taken by the first run and refused to a second while the first is alive', () => {
    const lock = acquireRunLock(file, { pid: 101, now: at });
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
      pid: 101,
      startedAt: '2026-09-29T12:00:00.000Z',
    });

    expect(() =>
      acquireRunLock(file, { pid: 202, isRunning: (pid) => pid === 101 }),
    ).toThrow(/another fetch is running \(process 101/);

    lock.release();
    expect(existsSync(file)).toBe(false);
    acquireRunLock(file, { pid: 202 }).release();
  });

  it('is taken over from a run that was killed', () => {
    acquireRunLock(file, { pid: 101 }); // never released: the run was killed
    const lock = acquireRunLock(file, { pid: 202, isRunning: () => false });
    expect(JSON.parse(readFileSync(file, 'utf8')).pid).toBe(202);
    lock.release();
  });

  it('is taken over when the file is unreadable', () => {
    acquireRunLock(file, { pid: 101 }).release();
    writeFileSync(file, 'not json');
    expect(() =>
      acquireRunLock(file, { pid: 202, isRunning: () => true }).release(),
    ).not.toThrow();
  });

  it('leaves alone a lock another run has taken since', () => {
    const lock = acquireRunLock(file, { pid: 101 });
    writeFileSync(file, JSON.stringify({ pid: 303, startedAt: 'later' }));
    lock.release();
    expect(JSON.parse(readFileSync(file, 'utf8')).pid).toBe(303);
  });

  it('knows this process is running', () => {
    expect(isProcessRunning(process.pid)).toBe(true);
  });
});
