// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'gvjb.png'],
      manifest: {
        name: 'Spectropy LMS',
        short_name: 'Spectropy',
        description: 'Spectropy Learning Management System',
        theme_color: '#0b1f44',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // The production bundle is slightly above 4 MiB. Keep the ceiling
        // explicit and bounded while still allowing Workbox to precache it.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Subject simulation engines are fetched only when that subject opens.
        // Keeping them out of the install precache preserves subject-level lazy loading.
        globIgnores: ['**/simulation-runtimes/**'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5100,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
