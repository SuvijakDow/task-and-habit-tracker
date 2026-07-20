import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor_firebase';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor_react';
            if (id.includes('lucide-react')) return 'vendor_icons';
            if (id.includes('date-fns')) return 'vendor_datefns';
            return 'vendor_misc';
          }
        },
      },
    },
  },
})
