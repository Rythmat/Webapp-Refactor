import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeSync,
} from 'node:fs';
import { dirname } from 'node:path';

/**
 * One fetch at a time on this machine.
 *
 * Each client spaces its own requests, but two runs are two clients: a
 * `--limit` smoke test started while the unattended run is going would
 * double the rate MusicBrainz sees from this IP, which is how an IP gets
 * blocked. So a fetch holds a lock file naming its process, and a second one
 * refuses to start while that process is alive. A run that was killed can't
 * clean up after itself; its lock names a process that is gone, and the next
 * run takes it over.
 */

interface Holder {
  pid: number;
  startedAt: string;
}

export interface RunLock {
  release(): void;
}

export function isProcessRunning(pid: number): boolean {
  try {
    // Signal 0 checks the process exists without touching it.
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: it exists, it just isn't ours to signal.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function holderOf(file: string): Holder | null {
  try {
    const holder = JSON.parse(readFileSync(file, 'utf8')) as Partial<Holder>;
    return typeof holder.pid === 'number'
      ? { pid: holder.pid, startedAt: String(holder.startedAt ?? '?') }
      : null;
  } catch {
    return null;
  }
}

export function acquireRunLock(
  file: string,
  {
    pid = process.pid,
    isRunning = isProcessRunning,
    now = () => new Date(),
  }: {
    pid?: number;
    isRunning?: (pid: number) => boolean;
    now?: () => Date;
  } = {},
): RunLock {
  mkdirSync(dirname(file), { recursive: true });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // 'wx' fails if the file exists: taking the lock and checking for it
      // are one step, so two runs starting together can't both win.
      const fd = openSync(file, 'wx');
      try {
        writeSync(
          fd,
          JSON.stringify({
            pid,
            startedAt: now().toISOString(),
          } satisfies Holder),
        );
      } finally {
        closeSync(fd);
      }
      return {
        release() {
          if (holderOf(file)?.pid === pid) rmSync(file, { force: true });
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    const holder = holderOf(file);
    if (holder && isRunning(holder.pid)) {
      throw new Error(
        `another fetch is running (process ${holder.pid}, since ${holder.startedAt}). ` +
          'Two at once would double the request rate; wait for it to finish, or stop it first.',
      );
    }
    // Left by a run that was killed, or unreadable: nobody holds it.
    rmSync(file, { force: true });
  }
  throw new Error(`could not take the fetch lock ${file}`);
}
