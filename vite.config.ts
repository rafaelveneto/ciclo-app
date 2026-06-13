import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ciclo-app/',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
