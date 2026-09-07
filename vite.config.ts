import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// jsPDF optionally pulls html2canvas/canvg/dompurify for its html() and canvas
// paths. The report only draws text and vectors, so we alias them away (~376 kB).
const emptyStub = fileURLToPath(new URL('./src/stubs/empty.ts', import.meta.url))

export default defineConfig({
  base: '/ciclo-app/',
  resolve: {
    alias: {
      html2canvas: emptyStub,
      canvg: emptyStub,
      dompurify: emptyStub,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ciclo — Controle Menstrual',
        short_name: 'Ciclo',
        description: 'Acompanhamento do ciclo menstrual com privacidade total',
        theme_color: '#8b5cf6',
        background_color: '#faf5ff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        start_url: '/ciclo-app/',
        scope: '/ciclo-app/',
        // Full-bleed icon: valid as both "any" and "maskable" (opaque, mark in safe zone).
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // The PDF generator is big and rarely used — don't make every install pay
        // for it up front; cache it the first time she taps "gerar relatório".
        globIgnores: ['**/jspdf*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/jspdf.*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'pdf-lib', expiration: { maxEntries: 2 } }
          }
        ],
        // Adds our push + notificationclick handlers into the generated service worker.
        importScripts: ['push-sw.js']
      }
    })
  ]
})
