import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import tsconfigPaths from 'vite-tsconfig-paths';
// From vitest/config, not vite: the `test` block below is not part of vite's
// own UserConfig, and importing defineConfig from 'vite' makes `tsc -b` (and
// therefore `npm run build`) fail on it.
import { defineConfig } from 'vitest/config';

const analyze = process.env.ANALYZE === '1';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    analyze &&
      visualizer({
        filename: 'docs/optimization/baseline-2026-06-10/bundle.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  server: {
    port: 5179,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@prism/engine': path.resolve(__dirname, 'src/daw/prism-engine/index.ts'),
    },
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
  },
});
