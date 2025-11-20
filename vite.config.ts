import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { getDevKey } from './scripts/generate-dev-key.js'

// 自定义插件：在构建后处理 HTML 文件
function postBuildPlugin() {
  return {
    name: 'post-build-plugin',
    closeBundle() {
      const htmlPath = resolve(process.cwd(), 'dist/src/popup/index.html')
      const outputPath = resolve(process.cwd(), 'dist/popup.html')
      
      if (existsSync(htmlPath)) {
        let content = readFileSync(htmlPath, 'utf-8')
        // 修复路径引用（处理双引号和单引号的情况）
        content = content.replace(/src=["']\/theme-loader\.js["']/g, 'src="./theme-loader.js"')
        content = content.replace(/src=["']\/popup\.js["']/g, 'src="./popup.js"')
        content = content.replace(/href=["']\/index\.css["']/g, 'href="./index.css"')
        writeFileSync(outputPath, content, 'utf-8')
        console.log('✓ Created popup.html with fixed paths')
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  // 加载环境变量（Vite 会自动处理 VITE_ 前缀的环境变量）
  // 在代码中可以直接使用 import.meta.env.VITE_SUPABASE_URL
  
  // 获取开发密钥
  const devKeyData = mode === 'development' ? getDevKey() : null;

  return {
  // 开发服务器配置（用于预览）
  server: {
    port: 3000,
    open: '/src/preview/dev-preview.html',
    host: true
  },
  build: {
    outDir: 'dist',
    // 生产环境禁用 source maps（防止逆向工程）
    sourcemap: mode === 'development',
    // 使用 esbuild 压缩（更快，但 terser 更强）
    minify: 'esbuild',
    rollupOptions: {
      input: {
        popup: resolve(fileURLToPath(new URL('./src/popup/index.html', import.meta.url))),
        'dev-preview': resolve(fileURLToPath(new URL('./src/preview/dev-preview.html', import.meta.url))),
        'theme-loader': resolve(fileURLToPath(new URL('./src/popup/theme-loader.ts', import.meta.url))),
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
    react(),
    postBuildPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
          // 关键点：使用 transform 修改 manifest 内容
          transform: (content) => {
            const manifest = JSON.parse(content.toString());
            
            // 仅在开发模式下注入 key
            if (mode === 'development' && devKeyData) {
              manifest.key = devKeyData.publicKey;
            }
            
            return JSON.stringify(manifest, null, 2);
          }
        },
        // Copy extension icon used by notifications and UI
        {
          src: 'icon.png',
          dest: '.'
        },
        // Copy preview.html for development
        {
          src: 'preview.html',
          dest: '.'
        }
      ]
    })
  ]
  }
})
