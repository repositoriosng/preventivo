import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sistema de Inventario',
        short_name: 'Inventario',
        description: 'Sistema local de gestion de inventario',
        theme_color: '#1D9E75',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait'
      },
      workbox: {}
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
