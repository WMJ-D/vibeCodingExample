import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 参考 webapp-build-sync 中 emptyOutDir:false 的安全策略：
// 工程位于父级 vibeCodingExample 之下，禁用 emptyOutDir 避免把同名子工程误清空
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    open: false
  },
  emptyOutDir: false
})
