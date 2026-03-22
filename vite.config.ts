import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  server: {
    port: 5179,
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
