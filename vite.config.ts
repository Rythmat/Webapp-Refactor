import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

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
    exclude: ['@ffmpeg/ffmpeg', 'ffmpeg'],
  },
  define: {
    __COMMIT_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || 'dev'),
  },
});
