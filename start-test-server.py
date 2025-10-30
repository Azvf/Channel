#!/usr/bin/env python3
"""
简单的本地测试服务器
用于测试 WebGL 功能
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# 设置端口
PORT = 8080

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加 CORS 头，允许跨域访问
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def start_server():
    # 切换到项目目录
    project_dir = Path(__file__).parent
    os.chdir(project_dir)
    
    # 创建服务器
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 WebGL 测试服务器已启动")
        print(f"📁 服务目录: {project_dir}")
        print(f"🌐 访问地址: http://localhost:{PORT}")
        print(f"🧪 测试页面: http://localhost:{PORT}/test-webgl.html")
        print(f"📦 扩展文件: http://localhost:{PORT}/dist/")
        print("\n按 Ctrl+C 停止服务器")
        
        # 自动打开浏览器
        try:
            webbrowser.open(f'http://localhost:{PORT}/test-webgl.html')
        except:
            print("⚠️  无法自动打开浏览器，请手动访问上述地址")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 服务器已停止")

if __name__ == "__main__":
    start_server()
