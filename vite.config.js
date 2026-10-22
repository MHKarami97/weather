import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// برای GitHub Pages روی زیرمسیر (مثلاً user.github.io/weather) مقدار VITE_BASE=/weather/ بدهید.
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'هواشناسی | آب‌وهوای ایران',
        short_name: 'هواشناسی',
        description: 'وضعیت لحظه‌ای و پیش‌بینی آب‌وهوای تمام استان‌های ایران',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-48.png', sizes: '48x48', type: 'image/png' },
          { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/data\/(latest|provinces\/[^/]+)\.json/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-data-cache',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
  build: { target: 'es2019', sourcemap: false },
})
