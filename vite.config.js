import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative base for Electron, absolute for GitHub Pages
  base: process.env.ELECTRON_BUILD ? './' : '/health-tracker/',
  server: {
    watch: {
      // Ignore macOS AppleDouble resource-fork files (e.g. from cloud-synced
      // drives) so they don't trigger spurious dev-server reloads.
      ignored: ['**/._*'],
    },
  },
})
