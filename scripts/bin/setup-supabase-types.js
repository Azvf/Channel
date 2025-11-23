#!/usr/bin/env node
/**
 * Supabase 类型生成辅助脚本
 * 
 * 使用方法：
 *   1. 从 Supabase URL 自动提取项目 ID
 *   2. 或手动输入项目 ID
 *   3. 生成类型定义文件
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
// 获取项目根目录：从 scripts/bin/setup-supabase-types.js 向上两级到项目根目录
// scripts/bin/setup-supabase-types.js -> scripts/bin -> scripts -> 项目根目录
const scriptDir = dirname(__filename);
// 尝试从脚本位置计算，如果失败则使用 process.cwd()
let projectRoot;
try {
  projectRoot = resolve(scriptDir, '..', '..', '..');
  // 验证是否是项目根目录（检查是否存在 package.json）
  if (!existsSync(resolve(projectRoot, 'package.json'))) {
    // 如果从脚本位置计算失败，使用当前工作目录
    projectRoot = process.cwd();
  }
} catch {
  projectRoot = process.cwd();
}

/**
 * 从 Supabase URL 中提取项目 ID
 * 格式：https://<project-id>.supabase.co
 */
function extractProjectIdFromUrl(url) {
  const match = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
  return match ? match[1] : null;
}

/**
 * 从环境变量或 .env 文件中读取 Supabase URL
 */
function getSupabaseUrl() {
  // 1. 检查环境变量
  if (process.env.VITE_SUPABASE_URL) {
    return process.env.VITE_SUPABASE_URL;
  }

  // 2. 检查 .env 文件（按优先级顺序）
  const envFiles = ['.env.local', '.env.development', '.env.production', '.env'];
  for (const envFile of envFiles) {
    const envPath = resolve(projectRoot, envFile);
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf-8');
        // 支持多种格式：VITE_SUPABASE_URL=xxx 或 VITE_SUPABASE_URL="xxx" 或 VITE_SUPABASE_URL='xxx'
        // 匹配整行，包括注释后的内容
        const lines = content.split('\n');
        for (const line of lines) {
          // 忽略注释行
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('#') || !trimmedLine) continue;
          
          // 匹配 VITE_SUPABASE_URL=value（支持引号）
          const match = trimmedLine.match(/^VITE_SUPABASE_URL\s*=\s*(.+?)(?:\s*#|$)/);
          if (match) {
            const url = match[1].trim().replace(/^['"]|['"]$/g, '');
            if (url) {
              return url;
            }
          }
        }
      } catch (error) {
        // 忽略读取错误，继续检查下一个文件
        console.error(`读取 ${envFile} 时出错:`, error.message);
      }
    }
  }

  return null;
}

/**
 * 验证项目 ID 格式
 */
function isValidProjectId(projectId) {
  // Supabase 项目 ID 通常是 20 个字符的字母数字字符串
  return /^[a-z0-9]{20}$/.test(projectId);
}

/**
 * 生成类型定义
 */
function generateTypes(projectId) {
  const outputPath = resolve(projectRoot, 'src', 'shared', 'types', 'database.types.ts');
  
  try {
    console.log(`📦 正在从 Supabase 项目生成类型定义...`);
    console.log(`   项目 ID: ${projectId}`);
    
    const command = `supabase gen types typescript --project-id ${projectId}`;
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    
    // 添加文件头注释
    const header = `// ==========================================
// 自动生成的数据库类型定义
// ==========================================
// 
// ⚠️ 警告：此文件由 Supabase CLI 自动生成，请勿手动编辑！
// 
// 生成命令：
//   npm run gen:types
// 
// 或使用辅助脚本：
//   node scripts/bin/setup-supabase-types.js
// 
// 生成时间：${new Date().toISOString()}
// 项目 ID：${projectId}
// ==========================================

`;
    
    writeFileSync(outputPath, header + output, 'utf-8');
    console.log(`✅ 类型定义已生成：${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ 生成类型定义失败：`);
    console.error(`   ${error.message}`);
    
    if (error.message.includes('Invalid project ref')) {
      console.error(`\n💡 提示：项目 ID 格式不正确。`);
      console.error(`   项目 ID 应该是 20 个字符的字母数字字符串。`);
      console.error(`   请检查：${projectId}`);
    } else if (error.message.includes('not found') || error.message.includes('authentication')) {
      console.error(`\n💡 提示：请先登录 Supabase CLI：`);
      console.error(`   supabase login`);
    }
    
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 Supabase 类型生成辅助工具\n');

  // 1. 尝试从环境变量或 .env 文件获取 URL
  const supabaseUrl = getSupabaseUrl();
  let projectId = process.env.SUPABASE_PROJECT_ID;

  if (supabaseUrl) {
    console.log(`📋 检测到 Supabase URL: ${supabaseUrl}`);
    const extractedId = extractProjectIdFromUrl(supabaseUrl);
    if (extractedId) {
      console.log(`   提取的项目 ID: ${extractedId}`);
      if (!projectId) {
        projectId = extractedId;
      }
    }
  }

  // 2. 如果还没有项目 ID，提示用户输入
  if (!projectId || !isValidProjectId(projectId)) {
    console.log('\n❓ 未找到有效的项目 ID');
    console.log('\n请选择以下方式之一：');
    console.log('1. 设置环境变量：export SUPABASE_PROJECT_ID=your-project-id');
    console.log('2. 在 .env 文件中设置：VITE_SUPABASE_URL=https://your-project-id.supabase.co');
    console.log('3. 手动输入项目 ID（20 个字符的字母数字字符串）');
    console.log('\n💡 如何获取项目 ID：');
    console.log('   - 访问 Supabase Dashboard: https://app.supabase.com');
    console.log('   - 选择你的项目');
    console.log('   - 在 Settings > API 页面可以找到项目 URL');
    console.log('   - 项目 ID 是 URL 中的子域名部分');
    console.log('   例如：https://abcdefghijklmnopqrst.supabase.co');
    console.log('         项目 ID 是：abcdefghijklmnopqrst\n');
    
    if (projectId && !isValidProjectId(projectId)) {
      console.log(`⚠️  当前项目 ID "${projectId}" 格式不正确，请重新输入。\n`);
    }
    
    process.exit(1);
  }

  // 3. 验证项目 ID 格式
  if (!isValidProjectId(projectId)) {
    console.error(`❌ 项目 ID 格式不正确：${projectId}`);
    console.error(`   应该是 20 个字符的字母数字字符串`);
    process.exit(1);
  }

  // 4. 生成类型定义
  const success = generateTypes(projectId);
  process.exit(success ? 0 : 1);
}

main();

