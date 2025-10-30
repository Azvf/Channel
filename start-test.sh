#!/bin/bash

# WebGL 测试服务器启动脚本

echo "🚀 启动 WebGL 测试服务器..."

# 检查 Node.js 是否安装
if command -v node &> /dev/null; then
    echo "✅ 使用 Node.js 服务器"
    node start-test-server.js
elif command -v python3 &> /dev/null; then
    echo "✅ 使用 Python 服务器"
    python3 start-test-server.py
else
    echo "❌ 未找到 Node.js 或 Python3"
    echo "请安装 Node.js 或 Python3 来运行测试服务器"
    echo ""
    echo "或者直接打开 test-webgl.html 文件进行测试"
    exit 1
fi
