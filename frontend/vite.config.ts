import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Required so `*.css?inline` returns the PostCSS/Tailwind-compiled string
    // (HTML export inlines the app stylesheet at build time).
    css: true,
  },
});
