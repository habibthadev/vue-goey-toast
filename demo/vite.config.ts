import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

const localSrc = path.resolve(__dirname, '../src/index.ts')
const localCss = path.resolve(__dirname, '../src/components/GooeyToast.css')
const useLocalSource = fs.existsSync(localSrc)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      ...(useLocalSource
        ? {
            'vue-goey-toast/styles.css': localCss,
            'vue-goey-toast': localSrc,
          }
        : {}),
    },
  },
})
