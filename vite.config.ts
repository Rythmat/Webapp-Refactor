import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import tsconfigPaths from 'vite-tsconfig-paths';
// From vitest/config, not vite: the `test` block below is not part of vite's
// own UserConfig, and importing defineConfig from 'vite' makes `tsc -b` (and
// therefore `npm run build`) fail on it.
import { defineConfig } from 'vitest/config';
import { devContentWriter } from './scripts/vite/devContentWriter';
import { repoContentPlugin } from './scripts/vite/repoContentPlugin';

const analyze = process.env.ANALYZE === '1';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    // Repo mode: with VITE_CONTENT_REPO=1 the console saves into the repo's
    // data files on this machine. Dev server only, and inert without the flag.
    repoContentPlugin(),
    // Dev server only: Drum Grooves / Parts Library / synth patch files.
    devContentWriter(),
    analyze &&
      visualizer({
        filename:
          process.env.ANALYZE_OUT ??
          'docs/optimization/baseline-2026-06-10/bundle.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
    // The same sizes as JSON, for scripts/studio-perf/bundle.mjs.
    analyze &&
      process.env.ANALYZE_JSON &&
      visualizer({
        filename: process.env.ANALYZE_JSON,
        template: 'raw-data',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  // Scripts that start a dev server of their own (scripts/studio-perf) give it
  // a separate dep cache, so it never re-optimizes under the owner's server,
  // and, from a git worktree, the main checkout's env files.
  cacheDir: process.env.VITE_CACHE_DIR || undefined,
  envDir: process.env.VITE_ENV_DIR || undefined,
  server: {
    port: 5179,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@prism/engine': path.resolve(__dirname, 'src/daw/prism-engine/index.ts'),
    },
    // One copy each of the modules Radix overlays keep their shared stacks
    // in (open layers, focus traps, scroll locks). The pinned Radix packages
    // nest their own copies (react-select, react-menu, react-tooltip and
    // react-alert-dialog carry dismissable-layer 1.1.1, focus-scope 1.1.0 and
    // react-remove-scroll 2.6.0 beside the top-level 1.1.5, 1.1.2 and
    // 2.7.1), and two copies keep two stacks: a Select or a menu inside a
    // dialog fought the dialog's focus trap for focus, and one Escape closed
    // both. The 1.1.x copies differ only in a source-path comment, and the
    // scroll locks only in fixes and an optional prop, so every package
    // (cmdk's older nested copies too, which have the same exports) shares
    // the top-level one.
    dedupe: [
      '@radix-ui/react-dismissable-layer',
      '@radix-ui/react-focus-scope',
      'react-remove-scroll',
    ],
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', 'ffmpeg', 'date-fns'],
    // react-qr-code is only reachable behind lazy classroom/teacher routes, so
    // Vite discovers it mid-session and re-optimizes — stranding already-loaded
    // pages on stale dep chunks. Pre-bundle it at startup to avoid that churn.
    include: ['react-qr-code'],
  },
  define: {
    __COMMIT_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || 'dev'),
  },
  test: {
    // `src/constants/env.ts` throws on a missing key at import time, so any test
    // whose module graph reaches AuthContext (several classroom suites do) fails
    // to collect without this. Placeholder only — nothing here is called.
    env: {
      VITE_MUSIC_ATLAS_API_URL:
        process.env.VITE_MUSIC_ATLAS_API_URL ?? 'http://localhost:3000',
      // Left unset on purpose: the content loader treats a missing CDN URL as
      // "use the bundled .ts data", which is the behaviour tests should see.
    },
    // Opt-in per file via `// @vitest-environment jsdom`; this only registers
    // the matchers and the msw lifecycle for the files that ask for them.
    setupFiles: ['./src/test/setup.ts'],
    // Tests load Radix through Vite, as the app does, so resolve.dedupe
    // above applies to them too; Node's own resolver would load the nested
    // copies.
    server: { deps: { inline: [/@radix-ui\//] } },
  },
});
