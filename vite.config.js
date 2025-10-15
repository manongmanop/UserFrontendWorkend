import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// เปลี่ยนที่นี่ให้ตรงกับเครื่อง/พอร์ต backend ของคุณ
const BACKEND = 'http://10.198.200.52:5000'

export default defineConfig({
  plugins: [react(),mkcert()],
  server: {
    host: true,        // ให้เข้าผ่าน IP LAN ได้ (เช่น http://10.198.200.52:5173)
    https: true,      // Dev ง่ายสุดใช้ http ทั้งคู่
    proxy: {
      // ครอบคลุมทุก API ของคุณ
      '/api': {
        target: BACKEND,
        changeOrigin: true,
      },
      // ให้รูป/วิดีโอที่เสิร์ฟจาก Express ใช้งานผ่าน frontend origin ได้
      '/uploads': {
        target: BACKEND,
        changeOrigin: true,
      },
      // เผื่อคุณมี /health บน backend
      '/health': {
        target: BACKEND,
        changeOrigin: true,
      },
    },
  },
})
