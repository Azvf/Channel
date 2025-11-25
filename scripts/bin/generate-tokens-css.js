#!/usr/bin/env node
/**
 * Design Tokens CSS Generator
 * 
 * 从 tokens.ts 自动生成 tokens.css
 * 确保 Design Tokens 是单一真理源
 * 
 * 实现方式：使用 tsx 直接导入 TypeScript 模块
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, relative } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const tokensPath = join(projectRoot, 'src/design-tokens/index.ts');
const outputPath = join(projectRoot, 'src/popup/styles/tokens.generated.css');

/**
 * 获取 CSS 变量值
 */
function getCssVarValue(token) {
  if (typeof token === 'object' && token !== null) {
    if ('rem' in token) return `${token.rem}rem`;
    if ('px' in token) return `${token.px}px`;
    if ('vh' in token) return `${token.vh}vh`;
    if ('em' in token) return `${token.em}em`;
    if ('percent' in token) return `${token.percent}%`;
    if ('value' in token) return String(token.value);
    if ('ms' in token) return `${token.ms}ms`;
    if ('bezier' in token) return `cubic-bezier(${token.bezier.join(', ')})`;
  }
  return String(token);
}

/**
 * 生成 CSS 变量
 */
function generateCSS(tokens) {
  let css = `/* ========================================
   AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
   Generated from: src/design-tokens/index.ts
   Run: npm run generate:tokens
   ======================================== */

:root {
`;

  // 生成 SPACING 变量
  if (tokens.SPACING) {
    css += `  /* Spacing Scale (4px Grid System) */\n`;
    for (const [key, value] of Object.entries(tokens.SPACING)) {
      const cssKey = key.replace(/\./g, '_');
      const cssValue = getCssVarValue(value);
      css += `  --space-${cssKey}: ${cssValue};\n`;
    }
    css += `\n`;
  }

  // 生成 RADIUS 变量
  if (tokens.RADIUS) {
    css += `  /* Radius Scale (Liquid Conformality) */\n`;
    for (const [key, value] of Object.entries(tokens.RADIUS)) {
      const cssValue = getCssVarValue(value);
      css += `  --radius-${key}: ${cssValue};\n`;
    }
    css += `\n`;
  }

  // 生成 Z_INDEX 变量
  if (tokens.Z_INDEX) {
    css += `  /* Z-Index Scale (Semantic Elevation) */\n`;
    for (const [key, value] of Object.entries(tokens.Z_INDEX)) {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      css += `  --z-${cssKey}: ${value};\n`;
    }
    css += `\n`;
  }

  // 生成 LAYOUT 变量
  if (tokens.LAYOUT) {
    css += `  /* Layout Constants */\n`;
    for (const [key, value] of Object.entries(tokens.LAYOUT)) {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const cssValue = getCssVarValue(value);
      css += `  --${cssKey}: ${cssValue};\n`;
    }
    css += `\n`;
  }

  // 生成 ANIMATION 变量
  if (tokens.ANIMATION) {
    css += `  /* Animation Tokens */\n`;
    
    // Duration
    if (tokens.ANIMATION.duration) {
      for (const [key, value] of Object.entries(tokens.ANIMATION.duration)) {
        const cssValue = getCssVarValue(value);
        css += `  --transition-${key}: ${cssValue};\n`;
        // hero 动画已经在上面生成了，不需要重复生成
      }
    }
    
    // Ease
    if (tokens.ANIMATION.ease) {
      for (const [key, value] of Object.entries(tokens.ANIMATION.ease)) {
        const cssValue = getCssVarValue(value);
        // 转换 outCubic -> out-cubic
        const cssKey = key === 'outCubic' ? 'out-cubic' : key;
        css += `  --ease-${cssKey}: ${cssValue};\n`;
      }
    }
    
    css += `\n`;
  }

  // 生成 GLASS 变量
  if (tokens.GLASS) {
    css += `  /* Glass Physics System */\n`;
    for (const [key, value] of Object.entries(tokens.GLASS)) {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const cssValue = getCssVarValue(value);
      css += `  --glass-${cssKey}: ${cssValue};\n`;
    }
    css += `\n`;
  }

  // 生成 ICON_SIZES 变量
  if (tokens.ICON_SIZES) {
    css += `  /* Icon Sizes */\n`;
    for (const [key, value] of Object.entries(tokens.ICON_SIZES)) {
      const cssValue = getCssVarValue(value);
      css += `  --icon-size-${key}: ${cssValue};\n`;
    }
    css += `\n`;
  }

  // 生成 COLORS 变量
  if (tokens.COLORS) {
    css += `  /* Color Primitives */\n`;
    for (const [key, value] of Object.entries(tokens.COLORS)) {
      css += `  --c-${key}: ${value};\n`;
    }
    css += `\n`;
  }

  css += `}\n`;
  return css;
}

/**
 * 主函数：使用 tsx 导入 TypeScript 模块
 */
async function main() {
  try {
    // 创建一个临时脚本文件来导入 tokens
    // 在 Windows 上，使用 file:// URL 来确保路径正确
    const tokensFileURL = pathToFileURL(tokensPath).href;
    const outputFileURL = pathToFileURL(outputPath).href;
    
    const tempScript = `
import { TOKENS } from '${tokensFileURL}';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputPath = fileURLToPath('${outputFileURL}');

function getCssVarValue(token) {
  if (typeof token === 'object' && token !== null) {
    if ('rem' in token) return \`\${token.rem}rem\`;
    if ('px' in token) return \`\${token.px}px\`;
    if ('vh' in token) return \`\${token.vh}vh\`;
    if ('em' in token) return \`\${token.em}em\`;
    if ('percent' in token) return \`\${token.percent}%\`;
    if ('value' in token) return String(token.value);
    if ('ms' in token) return \`\${token.ms}ms\`;
    if ('bezier' in token) return \`cubic-bezier(\${token.bezier.join(', ')})\`;
  }
  return String(token);
}

function generateCSS(tokens) {
  let css = \`/* ========================================
   AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
   Generated from: src/design-tokens/index.ts
   Run: npm run generate:tokens
   ======================================== */

:root {
\`;

  if (tokens.SPACING) {
    css += \`  /* Spacing Scale (4px Grid System) */\\n\`;
    for (const [key, value] of Object.entries(tokens.SPACING)) {
      const cssKey = key.replace(/\\./g, '_');
      const cssValue = getCssVarValue(value);
      css += \`  --space-\${cssKey}: \${cssValue};\\n\`;
    }
    css += \`\\n\`;
  }

  if (tokens.RADIUS) {
    css += \`  /* Radius Scale (Liquid Conformality) */\\n\`;
    for (const [key, value] of Object.entries(tokens.RADIUS)) {
      const cssValue = getCssVarValue(value);
      css += \`  --radius-\${key}: \${cssValue};\\n\`;
    }
    css += \`\\n\`;
  }

  if (tokens.Z_INDEX) {
    css += \`  /* Z-Index Scale (Semantic Elevation) */\\n\`;
    for (const [key, value] of Object.entries(tokens.Z_INDEX)) {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      css += \`  --z-\${cssKey}: \${value};\\n\`;
    }
    css += \`\\n\`;
  }

  if (tokens.LAYOUT) {
    css += \`  /* Layout Constants */\\n\`;
    for (const [key, value] of Object.entries(tokens.LAYOUT)) {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const cssValue = getCssVarValue(value);
      css += \`  --\${cssKey}: \${cssValue};\\n\`;
    }
    css += \`\\n\`;
  }

  if (tokens.ANIMATION) {
    css += \`  /* Animation Tokens */\\n\`;
    if (tokens.ANIMATION.duration) {
      for (const [key, value] of Object.entries(tokens.ANIMATION.duration)) {
        const cssValue = getCssVarValue(value);
        css += \`  --transition-\${key}: \${cssValue};\\n\`;
      }
    }
    if (tokens.ANIMATION.ease) {
      for (const [key, value] of Object.entries(tokens.ANIMATION.ease)) {
        const cssValue = getCssVarValue(value);
        const cssKey = key === 'outCubic' ? 'out-cubic' : key;
        css += \`  --ease-\${cssKey}: \${cssValue};\\n\`;
      }
    }
    css += \`\\n\`;
  }

  if (tokens.GLASS) {
    css += \`  /* Glass Physics System */\\n\`;
    for (const [key, value] of Object.entries(tokens.GLASS)) {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const cssValue = getCssVarValue(value);
      css += \`  --glass-\${cssKey}: \${cssValue};\\n\`;
    }
    css += \`\\n\`;
  }

  if (tokens.ICON_SIZES) {
    css += \`  /* Icon Sizes */\\n\`;
    for (const [key, value] of Object.entries(tokens.ICON_SIZES)) {
      const cssValue = getCssVarValue(value);
      css += \`  --icon-size-\${key}: \${cssValue};\\n\`;
    }
    css += \`\\n\`;
  }

  if (tokens.COLORS) {
    css += \`  /* Color Primitives */\\n\`;
    for (const [key, value] of Object.entries(tokens.COLORS)) {
      css += \`  --c-\${key}: \${value};\\n\`;
    }
    css += \`\\n\`;
  }

  css += \`}\\n\`;
  return css;
}

const css = generateCSS(TOKENS);
writeFileSync(outputPath, css, 'utf-8');
console.log('✅ Generated', outputPath);
`;

    const tempFile = join(projectRoot, 'scripts/bin/.generate-tokens-temp.ts');
    writeFileSync(tempFile, tempScript, 'utf-8');

    try {
      // 使用 tsx 执行临时脚本
      // 使用相对路径以避免 Windows 路径问题
      const relativeTempFile = relative(projectRoot, tempFile);
      // 在 Windows 上使用引号包裹路径，确保包含空格的路径也能正确处理
      const command = process.platform === 'win32' 
        ? `npx tsx "${relativeTempFile}"`
        : `npx tsx ${relativeTempFile}`;
      
      execSync(command, {
        stdio: 'inherit',
        cwd: projectRoot,
        shell: process.platform === 'win32',
      });
      
      // 清理临时文件
      const { unlinkSync } = await import('fs');
      unlinkSync(tempFile);
    } catch (error) {
      // 清理临时文件
      try {
        const { unlinkSync } = await import('fs');
        unlinkSync(tempFile);
      } catch (e) {
        // 忽略清理错误
      }
      
      if (error.message.includes('tsx') || error.message.includes('command not found')) {
        console.error('❌ tsx is required to generate tokens CSS.');
        console.error('   Please install: npm install -D tsx');
        console.error('   Then run: npm run generate:tokens');
        process.exit(1);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error generating tokens CSS:', error.message);
    process.exit(1);
  }
}

main();
