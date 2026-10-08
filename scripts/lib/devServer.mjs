/* eslint-env node */
/**
 * Dev servers for the browser scripts (scripts/graphSmoke.mjs,
 * scripts/studio-perf): start Vite on a port of the script's own, wait until
 * it answers, and stop it again.
 *
 * Port 5179 is the owner's own dev server; scripts refuse it.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const OWNER_PORT = 5179;

export const isListening = async (port) => {
  try {
    await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(1500),
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Start a dev server from `root` on `port` with `env`, and wait until it
 * answers. Returns `{ stop }`; `stop()` writes the server's output to
 * `logFile` when one is given.
 */
export async function startServer({ root, port, env = {}, logFile = null }) {
  if (port === OWNER_PORT) {
    throw new Error(
      `port ${OWNER_PORT} is the owner's dev server; pick another`,
    );
  }
  if (await isListening(port)) {
    throw new Error(
      `port ${port} is already in use; stop that server or pick another port`,
    );
  }
  const log = [];
  const child = spawn(
    join(root, 'node_modules/.bin/vite'),
    ['--port', String(port), '--strictPort'],
    {
      cwd: root,
      env: { ...process.env, ...env },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stdout.on('data', (d) => log.push(String(d)));
  child.stderr.on('data', (d) => log.push(String(d)));
  const stop = () => {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
    if (logFile) writeFileSync(logFile, log.join(''));
  };
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      stop();
      throw new Error(
        `the dev server on ${port} exited:\n${log.join('').slice(-2000)}`,
      );
    }
    if (await isListening(port)) return { stop };
    await new Promise((r) => setTimeout(r, 300));
  }
  stop();
  throw new Error(`the dev server on ${port} did not answer within 60 s`);
}

/** Wait until nothing listens on `port` any more. */
export async function waitClosed(port) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (!(await isListening(port))) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
