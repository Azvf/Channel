import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(fileURLToPath(new URL('./src/popup/popup.ts', import.meta.url))),
        background: resolve(fileURLToPath(new URL('./src/background/background.ts', import.meta.url))),
        content: resolve(fileURLToPath(new URL('./src/content/content.ts', import.meta.url))),
        injected: resolve(fileURLToPath(new URL('./src/injected/injected.ts', import.meta.url)))
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.'
        },
        // Copy popup HTML and CSS so the extension can load them from dist root
        {
          src: 'src/popup/index.html',
          dest: '.',
          rename: 'popup.html'
        },
        {
          src: 'src/popup/popup.css',
          dest: '.',
          rename: 'popup.css'
        },
        // Copy extension icon used by notifications and UI
        {
          src: 'icon.png',
          dest: '.'
        }
      ]
    })
  ]
})
