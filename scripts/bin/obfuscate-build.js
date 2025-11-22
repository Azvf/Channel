import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import config from '../config/build/obfuscator.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('开始混淆构建输出文件...\n');

// 需要混淆的文件列表
const filesToObfuscate = [
  'dist/background.js',
  'dist/main.js',  // popup 的主文件
  'dist/content.js',
  'dist/injected.js',
  'dist/pageSettings.js'  // 如果存在也混淆
];

let successCount = 0;
let failCount = 0;

filesToObfuscate.forEach(file => {
  const filePath = path.resolve(__dirname, '../../', file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  文件不存在: ${file}`);
      failCount++;
      return;
    }
    
    console.log(`处理: ${file}`);
    const code = fs.readFileSync(filePath, 'utf8');
    
    // 只有非空文件才混淆
    if (code.trim().length === 0) {
      console.warn(`⚠️  文件为空，跳过: ${file}`);
      failCount++;
      return;
    }
    
    const obfuscated = JavaScriptObfuscator.obfuscate(code, config);
    const obfuscatedCode = obfuscated.getObfuscatedCode();
    
    // 备份原始文件
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, code);
    }
    
    // 写入混淆后的代码
    fs.writeFileSync(filePath, obfuscatedCode, 'utf8');
    
    const originalSize = (code.length / 1024).toFixed(2);
    const obfuscatedSize = (obfuscatedCode.length / 1024).toFixed(2);
    
    console.log(`  ✓ 成功 (${originalSize}KB → ${obfuscatedSize}KB)`);
    successCount++;
    
  } catch (error) {
    console.error(`  ✗ 失败: ${error.message}`);
    failCount++;
  }
});

console.log(`\n混淆完成: ${successCount} 成功, ${failCount} 失败`);

if (failCount > 0) {
  console.warn('\n警告: 部分文件混淆失败，构建可能无法正常工作');
  process.exit(1);
}

console.log('✓ 所有文件已成功混淆');

