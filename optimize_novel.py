#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说排版优化和Lint检查脚本
"""

import re
import sys
from pathlib import Path

def optimize_novel(input_file, output_file=None):
    """
    优化小说排版
    """
    if output_file is None:
        output_file = input_file
    
    # 读取文件
    try:
        with open(input_file, 'r', encoding='utf-8-sig') as f:  # 使用utf-8-sig自动去除BOM
            content = f.read()
        # 再次确保去除BOM字符
        if content.startswith('\ufeff'):
            content = content[1:]
    except Exception as e:
        print(f"读取文件失败: {e}")
        return False
    
    original_lines = content.split('\n')
    optimized_lines = []
    prev_empty = False
    
    # 统计信息
    stats = {
        'total_lines': len(original_lines),
        'empty_lines_removed': 0,
        'chapters_found': 0,
        'formatting_fixed': 0,
        'trailing_spaces_removed': 0
    }
    
    i = 0
    while i < len(original_lines):
        line = original_lines[i]
        # 去除行尾空格和BOM字符
        stripped = line.rstrip().replace('\ufeff', '')
        
        if line.rstrip() != line:
            stats['trailing_spaces_removed'] += 1
        
        # 处理空行
        if not stripped:
            if not prev_empty:
                optimized_lines.append('')
                prev_empty = True
            else:
                stats['empty_lines_removed'] += 1
            i += 1
            continue
        
        prev_empty = False
        
        # 检查章节标题格式
        chapter_patterns = [
            r'^第[一二三四五六七八九十百千万\d]+章',
            r'^第\d+章',
        ]
        
        is_chapter = False
        for pattern in chapter_patterns:
            # 去除全角空格后检查
            test_line = stripped.lstrip('　')
            if re.match(pattern, test_line):
                is_chapter = True
                stats['chapters_found'] += 1
                # 确保章节标题前后有空行
                if optimized_lines and optimized_lines[-1].strip():
                    optimized_lines.append('')
                # 规范化章节标题格式（保留两个全角空格前缀）
                optimized_lines.append('　　' + test_line)
                # 章节标题后添加空行
                if i + 1 < len(original_lines) and original_lines[i + 1].strip():
                    optimized_lines.append('')
                break
        
        if not is_chapter:
            # 普通段落处理
            # 去除全角空格前缀，准备重新规范化
            content_part = stripped.lstrip('　')
            
            # 规范化全角空格前缀（统一为两个全角空格）
            normalized_line = '　　' + content_part
            
            # 检查是否需要修复
            if stripped != normalized_line:
                stats['formatting_fixed'] += 1
            
            optimized_lines.append(normalized_line)
        
        i += 1
    
    # 去除文件末尾的多余空行
    while optimized_lines and not optimized_lines[-1].strip():
        optimized_lines.pop()
        stats['empty_lines_removed'] += 1
    
    # 写入优化后的内容
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(optimized_lines))
        print(f"✓ 文件优化完成: {output_file}")
        print(f"  总行数: {stats['total_lines']}")
        print(f"  优化后行数: {len(optimized_lines)}")
        print(f"  移除空行: {stats['empty_lines_removed']}")
        print(f"  移除行尾空格: {stats['trailing_spaces_removed']}")
        print(f"  发现章节: {stats['chapters_found']}")
        print(f"  格式修复: {stats['formatting_fixed']}")
        return True
    except Exception as e:
        print(f"写入文件失败: {e}")
        return False


def lint_check(input_file):
    """
    进行Lint检查
    """
    issues = []
    
    try:
        with open(input_file, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"读取文件失败: {e}")
        return
    
    # 检查项
    consecutive_empty = 0
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        
        # 检查1: 连续空行（超过2个）
        if not stripped:
            consecutive_empty += 1
            if consecutive_empty > 2:
                issues.append({
                    'line': i,
                    'type': '连续空行',
                    'message': f'发现连续{consecutive_empty}个空行'
                })
        else:
            consecutive_empty = 0
        
        # 检查2: 行尾空格
        if line.rstrip() != line:
            issues.append({
                'line': i,
                'type': '行尾空格',
                'message': '行尾包含多余空格'
            })
        
        # 检查3: 全角空格前缀不规范
        if stripped and not stripped.startswith('　'):
            # 排除章节标题、空行等
            if not re.match(r'^第[一二三四五六七八九十百千万\d]+章', stripped.lstrip('　')):
                if not any(keyword in stripped for keyword in ['书名：', '作者：', '内容简介：', '第一部：', '第二部：', '【待续】']):
                    # 这可能是需要修复的格式问题
                    pass
        
        # 检查4: BOM字符
        if '\ufeff' in line:
            issues.append({
                'line': i,
                'type': 'BOM字符',
                'message': '行中包含BOM字符'
            })
    
    # 输出检查结果
    if issues:
        print(f"\n⚠ 发现 {len(issues)} 个潜在问题:")
        for issue in issues[:20]:  # 只显示前20个
            print(f"  行 {issue['line']}: [{issue['type']}] {issue['message']}")
        if len(issues) > 20:
            print(f"  ... 还有 {len(issues) - 20} 个问题未显示")
    else:
        print("\n✓ Lint检查通过，未发现明显问题")


def main():
    if len(sys.argv) < 2:
        print("用法: python optimize_novel.py <文件路径>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    if not Path(input_file).exists():
        print(f"错误: 文件不存在: {input_file}")
        sys.exit(1)
    
    print(f"开始优化文件: {input_file}")
    print("-" * 50)
    
    # 创建备份
    backup_file = input_file + '.bak'
    try:
        import shutil
        shutil.copy2(input_file, backup_file)
        print(f"✓ 已创建备份: {backup_file}")
    except Exception as e:
        print(f"⚠ 创建备份失败: {e}")
    
    # 优化排版
    if optimize_novel(input_file):
        print("-" * 50)
        # Lint检查
        lint_check(input_file)
        print("\n✓ 处理完成！")
    else:
        print("\n✗ 处理失败！")


if __name__ == '__main__':
    main()
