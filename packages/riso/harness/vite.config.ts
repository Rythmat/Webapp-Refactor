/**
 * The harness is a standalone Vite app, NOT part of music-atlas-webapp.
 *
 * Kept separate on purpose: the main app's dev server boots auth contexts, msw and ~900 modules,
 * and an env module that throws on a missing key. A parity failure there would be ambiguous. This
 * boots the engine and nothing else, so when tools/parity.ts reports a hash mismatch, the engine is
 * the only thing it can be.
 */
import path from 'node:path';
import { defineConfig } from 'vite';

const pkgRoot = path.resolve(__dirname, '..');

export default defineConfig({
  root: __dirname,
  /* The harness root is harness/, but every module it mounts lives in ../src. Vite refuses to
     serve files outside the root unless they are explicitly allowed, and the refusal surfaces as
     a blank "disallowed MIME type" module error rather than a 403, which is confusing. */
  server: { port: 5180, strictPort: true, fs: { allow: [pkgRoot] } },
  preview: { port: 5180, strictPort: true },
  clearScreen: false,
});
