import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["crypto-breakdown.ddns.net"],
    host: true,            // ← permet l'accès depuis ton réseau local (192.168.x.x)
    port: 5173,            // ← optionnel, fixe le port (par défaut 5173)
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
