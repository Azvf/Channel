// scripts/bin/generate-keys.js
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const DIST_MANIFEST_PATH = path.resolve(rootDir, 'dist/manifest.json');

/**
 * 加载环境变量文件（按优先级：.env.{mode} > .env）
 * @param {string} mode - 环境模式（development/production），如果不提供则从环境变量读取
 */
function loadEnvFiles(mode) {
  // 优先级：传入参数 > MODE 环境变量 > NODE_ENV > 默认 development
  const envMode = mode || process.env.MODE || process.env.NODE_ENV || 'development';
  
  // 先加载基础配置，再加载模式特定配置（后者会覆盖前者）
  const envPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  
  const modeEnvPath = path.resolve(rootDir, `.env.${envMode}`);
  if (fs.existsSync(modeEnvPath)) {
    dotenv.config({ path: modeEnvPath, override: true });
  }
  
  return envMode;
}

/**
 * 将 Buffer 转为 Chrome 扩展 ID 格式 (Base32 变体)
 * 算法：SHA256 -> Hex -> 取前32字符 -> 映射到 a-p
 */
function getExtensionId(publicKey) {
  const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
  const prefix = hash.slice(0, 32);
  let id = '';
  for (let i = 0; i < prefix.length; i++) {
    const val = parseInt(prefix[i], 16);
    // Chrome 扩展 ID 映射: 0-9, a-f -> a-p
    id += String.fromCharCode(97 + val);
  }
  return id;
}

/**
 * 格式化环境变量中的 PEM 字符串
 * CI/CD 中的 Secrets 通常会将换行符转义为 \\n，需要还原
 */
function formatPemFromEnv(envKey) {
  if (!envKey) return null;
  return envKey.replace(/\\n/g, '\n');
}

export function getDevKey(mode) {
  const envMode = loadEnvFiles(mode);
  const envKey = process.env.EXTENSION_PRIVATE_KEY;

  if (!envKey) {
    console.error('❌ [Key System] 环境变量 EXTENSION_PRIVATE_KEY 未配置！');
    console.error('');
    console.error('请按以下步骤配置：');
    console.error(`1. 在项目根目录创建 .env 或 .env.${envMode} 文件`);
    console.error('2. 添加以下内容：');
    console.error('   EXTENSION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...你的私钥内容...\\n-----END PRIVATE KEY-----"');
    console.error('');
    console.error('或者参考 .env.example 文件中的配置示例。');
    console.error('');
    const envPath = path.resolve(rootDir, '.env');
    const modeEnvPath = path.resolve(rootDir, `.env.${envMode}`);
    console.error(`当前模式: ${envMode}`);
    console.error(`已尝试加载: .env${fs.existsSync(envPath) ? ' ✓' : ' ✗'}, .env.${envMode}${fs.existsSync(modeEnvPath) ? ' ✓' : ' ✗'}`);
    process.exit(1);
  }

  // CI/CD Secrets 可能将换行符转义为 \\n，需要还原为实际换行符
  const privateKeyPem = formatPemFromEnv(envKey);

  if (!privateKeyPem) {
    console.error('❌ [Key System] 环境变量 EXTENSION_PRIVATE_KEY 格式错误！');
    process.exit(1);
  }

  // 使用 Node.js crypto 模块验证私钥格式，确保私钥有效
  let privateKeyObj;
  try {
    privateKeyObj = crypto.createPrivateKey(privateKeyPem);
  } catch (error) {
    console.error('❌ [Key System] 私钥解析失败！请检查环境变量 EXTENSION_PRIVATE_KEY 格式是否正确。');
    console.error('错误详情:', error.message);
    process.exit(1);
  }

  const publicKeyObj = crypto.createPublicKey(privateKeyObj);

  // Chrome Extension ID 需要 DER 格式的 buffer 进行计算，manifest 需要 Base64 字符串
  const publicKeyDer = publicKeyObj.export({ type: 'spki', format: 'der' });
  const publicKeyBase64 = publicKeyDer.toString('base64');
  const extensionId = getExtensionId(publicKeyDer);

  return {
    publicKey: publicKeyBase64,
    extensionId: extensionId
  };
}

/**
 * 验证 manifest.json 中的密钥注入状态
 */
function verifyManifestKey() {
  if (!fs.existsSync(DIST_MANIFEST_PATH)) {
    console.error('❌ dist/manifest.json 不存在，请先运行: npm run build:dev');
    process.exit(1);
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(DIST_MANIFEST_PATH, 'utf-8'));
    if (manifest.key) {
      console.log('✅ 密钥已注入到 dist/manifest.json');
      return true;
    } else {
      console.error('❌ dist/manifest.json 中未找到 key 字段');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 读取 manifest.json 失败:', error.message);
    process.exit(1);
  }
}

// 命令行接口
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  
  if (command === '--verify' || command === '--check') {
    verifyManifestKey();
  } else {
    const { extensionId } = getDevKey();
    console.log(`Extension ID: ${extensionId}`);
    console.log(`Redirect URL: https://${extensionId}.chromiumapp.org/`);
  }
}

