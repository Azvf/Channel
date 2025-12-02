import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { getDevKey } from './scripts/bin/generate-keys.js'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

// 自定义插件：在构建后处理 HTML 文件
function postBuildPlugin() {
  return {
    name: 'post-build-plugin',
    closeBundle() {
      const htmlPath = resolve(process.cwd(), 'dist/src/popup/index.html')
      const outputPath = resolve(process.cwd(), 'dist/popup.html')
      const themeLoaderPath = resolve(process.cwd(), 'dist/theme-loader.js')
      
      if (existsSync(htmlPath)) {
        let content = readFileSync(htmlPath, 'utf-8')
        
        // 修复所有路径为相对路径（Chrome 扩展需要相对路径）
        // 源文件在 dist/src/popup/index.html，目标文件在 dist/popup.html
        // 所以需要将 ../../ 或 / 开头的路径改为 ./
        
        // 修复绝对路径（以 / 开头）
        content = content.replace(/src=["']\/([^"']+\.js)["']/g, 'src="./$1"')
        content = content.replace(/href=["']\/([^"']+\.css)["']/g, 'href="./$1"')
        
        // 修复相对路径（../../ 开头的，因为从 dist/src/popup/ 到 dist/ 需要回退两级）
        content = content.replace(/src=["']\.\.\/\.\.\/([^"']+\.js)["']/g, 'src="./$1"')
        content = content.replace(/href=["']\.\.\/\.\.\/([^"']+\.css)["']/g, 'href="./$1"')
        
        // 内联 theme-loader.js 到 <head> 中，消除闪白
        // 性能优化：同步执行，确保在首次渲染前设置 data-theme
        if (existsSync(themeLoaderPath)) {
          let themeLoaderContent = readFileSync(themeLoaderPath, 'utf-8')
          
          // 移除 source map 注释（如果存在）
          themeLoaderContent = themeLoaderContent.replace(/\/\/# sourceMappingURL=.*$/gm, '').trim()
          
          // 查找并替换 theme-loader script 标签
          // 匹配：<script type="module" ... src="./theme-loader.js"></script> 或类似格式
          const themeLoaderScriptRegex = /<script[^>]*src=["'][^"']*theme-loader\.js["'][^>]*><\/script>/i
          
          if (themeLoaderScriptRegex.test(content)) {
            // 替换为内联 script（非 module，非 defer，确保同步执行）
            // 注意：JavaScript 代码可以直接嵌入 script 标签，不需要 HTML 转义
            // 但需要处理 </script> 标签（如果代码中包含），使用字符串拼接避免被解析为结束标签
            const safeContent = themeLoaderContent.replace(/<\/script>/g, '<\\/script>')
            
            content = content.replace(
              themeLoaderScriptRegex,
              `<script>${safeContent}</script>`
            )
            console.log('✓ Inlined theme-loader.js to eliminate flash of white')
          }
        }
        
        writeFileSync(outputPath, content, 'utf-8')
        console.log('✓ Created popup.html with fixed paths')
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  // 加载环境变量（Vite 会自动处理 VITE_ 前缀的环境变量）
  // 在代码中可以直接使用 import.meta.env.VITE_SUPABASE_URL
  
  // 获取开发密钥（传递 mode 参数确保加载正确的环境变量文件）
  const devKeyData = mode === 'development' ? getDevKey(mode) : null;

  return {
  // 开发服务器配置（用于预览）
  server: {
    port: 3000,
    open: '/src/preview/dev-preview.html',
    host: true
  },
  base: './', // Chrome 扩展需要使用相对路径
  resolve: {
    alias: {
      '@': resolve(fileURLToPath(new URL('./src', import.meta.url))),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
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
    vanillaExtractPlugin(),
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
