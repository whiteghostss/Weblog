
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    proxy: {
      '/api/wallhaven': {
        target: 'https://wallhaven.cc/api/v1/search',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wallhaven/, ''),
        headers: {
          'Referer': 'https://wallhaven.cc'
        }
      }
    }
  }
})
