
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],

  server: {
    // Forward local AI demo requests to the Python backend
    proxy: {
      '/demo/flow': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true
      }
    }
  }
})
