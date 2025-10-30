#!/usr/bin/env node
/**
 * 简单的本地测试服务器
 * 用于测试 WebGL 功能
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;

// MIME 类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './test-webgl.html';
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <head><title>404 Not Found</title></head>
                        <body>
                            <h1>404 - 文件未找到</h1>
                            <p>请求的文件: ${filePath}</p>
                            <p><a href="/test-webgl.html">返回测试页面</a></p>
                        </body>
                    </html>
                `);
            } else {
                res.writeHead(500);
                res.end(`服务器错误: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('🚀 WebGL 测试服务器已启动');
    console.log(`📁 服务目录: ${process.cwd()}`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`🧪 测试页面: http://localhost:${PORT}/test-webgl.html`);
    console.log(`📦 扩展文件: http://localhost:${PORT}/dist/`);
    console.log('\n按 Ctrl+C 停止服务器');
    
    // 自动打开浏览器
    const openCommand = process.platform === 'win32' ? 'start' : 
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    exec(`${openCommand} http://localhost:${PORT}/test-webgl.html`, (error) => {
        if (error) {
            console.log('⚠️  无法自动打开浏览器，请手动访问上述地址');
        }
    });
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 服务器已停止');
    process.exit(0);
});
