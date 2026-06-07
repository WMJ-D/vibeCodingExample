/*
 * @Author: WangMingJun 2351405492@qq.com
 * @Date: 2026-03-13 14:50:43
 * @LastEditors: WangMingJun 2351405492@qq.com
 * @LastEditTime: 2026-03-23 16:07:33
 * @FilePath: \file-preview-demo\vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/element/index.scss" as *;`,
      }

    }

  }
})
