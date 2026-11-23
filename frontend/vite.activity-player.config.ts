import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    write: false,
    minify: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/features/teaching-studio/components/activityPlayerEntry.tsx', import.meta.url)),
      formats: ['iife'],
      name: 'SpectropyActivityPlayer',
      fileName: () => 'activity-player.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'activity-player.[ext]',
      },
    },
  },
});
