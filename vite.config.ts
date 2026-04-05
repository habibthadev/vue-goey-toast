import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), dts({ include: ['src'], rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', 'motion', 'motion/vue', 'vue-sonner'],
      output: {
        globals: {
          vue: 'Vue',
          'motion-v': 'MotionVue',
          'vue-sonner': 'VueSonner',
        },
        assetFileNames: 'index.css',
      },
    },
  },
})
