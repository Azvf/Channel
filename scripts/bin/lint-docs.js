#!/usr/bin/env node
/**
 * Documentation Linter
 * 
 * 检查文档中是否包含硬编码的数值（像素值、颜色代码等）
 * 强制执行《文档开发与维护规范》中的"严禁硬编码"规则
 * 
 * 检查项：
 * 1. 硬编码像素值 (\d+px)
 * 2. HEX 颜色代码 (#[0-9A-Fa-f]{3,6})
 * 3. 时间毫秒值 (\d+ms) - 在非代码块中
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const docsDir = join(projectRoot, 'docs');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * 检查文件内容是否包含硬编码值
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @returns {Array<{line: number, message: string}>} 错误列表
 */
function checkHardcodedValues(filePath, content) {
  const errors = [];
  const lines = content.split('\n');
  
  // 标记是否在代码块中
  let inCodeBlock = false;
  let codeBlockLanguage = '';
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // 检测代码块开始/结束
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        codeBlockLanguage = '';
      } else {
        inCodeBlock = true;
        // 提取语言标识（如果有）
        const match = line.match(/^```(\w+)?/);
        codeBlockLanguage = match ? match[1] : '';
      }
      return;
    }
    
    // 跳过代码块中的内容
    if (inCodeBlock) {
      return;
    }
    
    // 检查硬编码像素值（排除代码引用中的行号，如 `12:14:filepath`）
    const pxPattern = /(\d+)px/g;
    let match;
    while ((match = pxPattern.exec(line)) !== null) {
      // 排除代码引用格式中的行号
      if (!line.match(/^\s*```\d+:\d+:/)) {
        // 排除性能预算说明中的数值（如 "16.6ms (60fps)"）
        // 排除网格系统基础单位说明（如 "4px 网格系统"）
        if (!line.match(/性能预算|Performance Budget|RAIL|fps|帧|网格系统|网格基础单位/)) {
          errors.push({
            line: lineNum,
            message: `发现硬编码像素值: "${match[0]}"。请使用 Token 变量（如 var(--space-4)）代替。`,
          });
        }
      }
    }
    
    // 检查 HEX 颜色代码
    const hexPattern = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    while ((match = hexPattern.exec(line)) !== null) {
      errors.push({
        line: lineNum,
        message: `发现 HEX 颜色代码: "${match[0]}"。请使用 Token 变量（如 var(--c-action)）代替。`,
      });
    }
    
    // 检查时间毫秒值（排除代码引用）
    const msPattern = /(\d+)ms\b/g;
    while ((match = msPattern.exec(line)) !== null) {
      // 排除代码引用格式
      if (!line.match(/^\s*```\d+:\d+:/)) {
        // 排除性能预算说明中的数值（如 "50ms" 在 RAIL 模型中）
        if (!line.match(/性能预算|Performance Budget|RAIL|响应|Response|Animation|Idle|Load|Long Task/)) {
          errors.push({
            line: lineNum,
            message: `发现硬编码时间值: "${match[0]}"。请使用 Token 变量（如 var(--transition-fast)）代替。`,
          });
        }
      }
    }
  });
  
  return errors;
}

/**
 * 递归读取 docs 目录下的所有 .md 文件
 * @param {string} dir - 目录路径
 * @returns {Array<string>} 文件路径列表
 */
function getAllMarkdownFiles(dir) {
  const files = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 递归读取子目录
        files.push(...getAllMarkdownFiles(fullPath));
      } else if (stat.isFile() && extname(entry) === '.md') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error reading directory ${dir}:${colors.reset}`, error.message);
  }
  
  return files;
}

/**
 * 主函数
 */
function main() {
  console.log(`${colors.blue}📄 检查文档规范...${colors.reset}\n`);
  
  const files = getAllMarkdownFiles(docsDir);
  let totalErrors = 0;
  let filesWithErrors = 0;
  
  files.forEach((filePath) => {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const errors = checkHardcodedValues(filePath, content);
      
      if (errors.length > 0) {
        filesWithErrors++;
        totalErrors += errors.length;
        
        const relativePath = filePath.replace(projectRoot + '/', '');
        console.log(`${colors.red}❌ ${relativePath}${colors.reset}`);
        
        errors.forEach((error) => {
          console.log(`   ${colors.yellow}Line ${error.line}:${colors.reset} ${error.message}`);
        });
        
        console.log('');
      }
    } catch (error) {
      console.error(`${colors.red}Error reading file ${filePath}:${colors.reset}`, error.message);
      totalErrors++;
    }
  });
  
  if (totalErrors === 0) {
    console.log(`${colors.green}✅ 所有文档符合规范！${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(
      `${colors.red}❌ 发现 ${totalErrors} 个违规项（涉及 ${filesWithErrors} 个文件）${colors.reset}\n`
    );
    console.log(
      `${colors.yellow}💡 提示: 请参考《文档开发与维护规范》修复上述问题。${colors.reset}\n`
    );
    process.exit(1);
  }
}

main();

