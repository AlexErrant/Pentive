import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import checker from 'vite-plugin-checker'

export default defineConfig({
  plugins: [
    solidPlugin(),
    checker({
      typescript: true,
      eslint: {
        files: ['./src'],
        extensions: ['.ts', '.tsx']
      }
    })
  ],
  build: {
    target: 'esnext',
    polyfillDynamicImport: false
  }
})
