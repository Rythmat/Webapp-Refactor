/**
 * Writes src/daw/ui/daw-tokens.css, the Studio editor's design tokens on :root,
 * from src/daw/ui/tokens.ts (overhaul plan 2.1). src/main.tsx imports the
 * sheet, so every page, and every overlay portaled to <body>, reads the same
 * tokens. Run it after editing tokens.ts:
 *
 *   npm run studio:tokens
 *
 * tokens.test.ts fails while the file is stale.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAW_TOKENS_CSS_FILE } from '../../src/daw/ui/tokens.ts';

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/daw/ui/daw-tokens.css',
);
writeFileSync(out, DAW_TOKENS_CSS_FILE);
console.log(`Wrote ${out}`);
