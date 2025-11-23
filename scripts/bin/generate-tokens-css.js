#!/usr/bin/env node
/**
 * Design Tokens CSS Generator
 * 
 * 从 tokens.ts 自动生成 tokens.css
 * 确保 Design Tokens 是单一真理源
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// 由于 tokens.ts 是 TypeScript，我们需要通过构建后的 JS 文件读取
// 或者直接解析 TypeScript（简化版本：读取并提取值）
const tokensPath = join(__dirname, '../../src/design-tokens/tokens.ts');
const outputPath = join(__dirname, '../../src/popup/styles/tokens.generated.css');

try {
  const tokensContent = readFileSync(tokensPath, 'utf-8');
  
  // 生成 CSS 变量
  let css = `/* ========================================
   AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
   Generated from: src/design-tokens/tokens.ts
   Run: npm run generate:tokens
   ======================================== */

:root {
`;

  // 解析并生成 CSS 变量（简化版本，实际应该使用 TypeScript 编译器 API）
  // 这里我们生成一个基础版本，实际使用时应该通过构建脚本调用 TypeScript
  
  // 由于直接解析 TypeScript 比较复杂，这里提供一个占位符
  // 实际实现应该：
  // 1. 使用 ts-node 或 tsx 直接执行 tokens.ts
  // 2. 或者通过 Vite/构建工具在构建时生成
  
  css += `  /* Note: This file is generated from tokens.ts */
  /* For now, please manually sync values or use a build-time generator */
`;

  css += `}\n`;

  writeFileSync(outputPath, css, 'utf-8');
  console.log(`✅ Generated ${outputPath}`);
  console.log(`⚠️  Note: Full TypeScript parsing not implemented yet.`);
  console.log(`   Please use a build-time generator or manually sync values.`);
} catch (error) {
  console.error('❌ Error generating tokens CSS:', error);
  process.exit(1);
}

