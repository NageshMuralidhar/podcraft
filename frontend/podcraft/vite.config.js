import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 500
    },
    hmr: {
      overlay: true,
      port: 5173,
      host: 'localhost'
    },
    host: true,     // Listen on all addresses
    port: 5173,
    strictPort: true  // Fail if port is in use
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-icons']
  }
})
