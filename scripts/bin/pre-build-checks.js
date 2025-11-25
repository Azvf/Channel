#!/usr/bin/env node
/**
 * Pre-Build Architecture Checks
 * 
 * 在构建前执行所有架构守护检查，确保代码符合规范
 * 
 * 检查项：
 * 1. TypeScript 类型检查
 * 2. ESLint 检查（包含自定义规则）
 * 3. 依赖架构检查（dependency-cruiser）
 * 4. Design Tokens 生成（确保 CSS 变量是最新的）
 * 5. 文档规范检查（lint-docs）
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description, allowFailure = false) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🔍 ${description}`, 'blue');
  log('='.repeat(60), 'cyan');
  
  try {
    // 移除 NO_COLOR 以避免与 FORCE_COLOR 冲突
    const env = { ...process.env };
    delete env.NO_COLOR;
    env.FORCE_COLOR = '1';
    
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
    });
    log(`✅ ${description} - 通过`, 'green');
    return true;
  } catch (error) {
    if (allowFailure) {
      log(`⚠️  ${description} - 警告（允许失败）`, 'yellow');
      return true;
    } else {
      log(`❌ ${description} - 失败`, 'red');
      log(`\n错误信息: ${error.message}`, 'red');
      return false;
    }
  }
}

// 主函数
function main() {
  log('\n🚀 开始预构建架构检查...', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const checks = [
    {
      command: 'tsc --noEmit',
      description: 'TypeScript 类型检查',
      allowFailure: false,
    },
    {
      command: 'eslint src --ext .ts,.tsx',
      description: 'ESLint 检查（包含自定义规则）',
      allowFailure: false,
    },
    {
      command: 'dependency-cruiser --config .dependency-cruiser.cjs src',
      description: '依赖架构检查（dependency-cruiser）',
      allowFailure: false,
    },
    {
      command: 'node scripts/bin/lint-docs.js',
      description: '文档规范检查（严禁硬编码）',
      allowFailure: false,
    },
    {
      command: 'npm run generate:tokens',
      description: '生成 Design Tokens CSS',
      allowFailure: true, // 如果生成脚本未完全实现，允许失败
    },
  ];
  
  const results = checks.map(check => runCommand(check.command, check.description, check.allowFailure));
  
  const allPassed = results.every(result => result === true);
  
  log('\n' + '='.repeat(60), 'cyan');
  if (allPassed) {
    log('✅ 所有架构检查通过！可以开始构建。', 'green');
    process.exit(0);
  } else {
    log('❌ 架构检查失败！请修复错误后重试。', 'red');
    log('\n提示：', 'yellow');
    log('  - 修复 TypeScript 类型错误: npm run check:type', 'yellow');
    log('  - 修复 ESLint 错误: npm run lint:fix', 'yellow');
    log('  - 修复架构依赖违规: npm run check:arch', 'yellow');
    log('  - 修复文档规范违规: npm run check:docs', 'yellow');
    process.exit(1);
  }
}

main();

