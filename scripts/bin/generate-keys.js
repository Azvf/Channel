// scripts/generate-dev-key.js
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_PATH = path.resolve(__dirname, '../key.development.pem');
const DIST_MANIFEST_PATH = path.resolve(__dirname, '../dist/manifest.json');

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

export function getDevKey() {
  let privateKeyPem;

  // 1. 检查是否存在持久化的私钥，不存在则生成
  if (fs.existsSync(KEY_PATH)) {
    privateKeyPem = fs.readFileSync(KEY_PATH, 'utf8');
  } else {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKeyPem = privateKey;
    fs.writeFileSync(KEY_PATH, privateKeyPem);
  }

  // 2. 提取公钥对象
  const privateKeyObj = crypto.createPrivateKey(privateKeyPem);
  const publicKeyObj = crypto.createPublicKey(privateKeyObj);

  // 3. 导出公钥的 DER 格式 buffer (用于计算 ID) 和 Base64 (用于 manifest)
  const publicKeyDer = publicKeyObj.export({ type: 'spki', format: 'der' });
  const publicKeyBase64 = publicKeyDer.toString('base64');

  // 4. 计算 Extension ID
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

