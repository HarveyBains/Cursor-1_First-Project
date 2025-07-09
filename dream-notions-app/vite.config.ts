import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          dnd: ['react-dnd', 'react-dnd-html5-backend', 'react-dnd-touch-backend']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
