#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将中文标点符号转换为英文标点符号
"""

import sys
from pathlib import Path
import re

def convert_punctuation(input_file, output_file=None):
    """
    将中文标点符号转换为英文标点符号
    """
    if output_file is None:
        output_file = input_file
    
    # 标点符号映射表
    punctuation_map = {
        '，': ',',      # 中文逗号 → 英文逗号
        '。': '.',      # 中文句号 → 英文句号
        '？': '?',      # 中文问号 → 英文问号
        '！': '!',      # 中文感叹号 → 英文感叹号
        '：': ':',      # 中文冒号 → 英文冒号
        '；': ';',      # 中文分号 → 英文分号
        '"': '"',      # 中文左双引号 → 英文双引号
        '"': '"',      # 中文右双引号 → 英文双引号
        ''': "'",      # 中文左单引号 → 英文单引号
        ''': "'",      # 中文右单引号 → 英文单引号
        '（': '(',      # 中文左括号 → 英文左括号
        '）': ')',      # 中文右括号 → 英文右括号
        '【': '[',      # 中文左方括号 → 英文左方括号
        '】': ']',      # 中文右方括号 → 英文右方括号
    }
    
    # 统计信息
    stats = {
        'total_chars': 0,
        'converted': {},
        'total_converted': 0
    }
    
    # 读取文件
    try:
        with open(input_file, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        # 去除BOM
        if content.startswith('\ufeff'):
            content = content[1:]
    except Exception as e:
        print(f"读取文件失败: {e}")
        return False
    
    stats['total_chars'] = len(content)
    
    # 转换标点符号
    converted_content = content
    for chinese_punct, english_punct in punctuation_map.items():
        count = converted_content.count(chinese_punct)
        if count > 0:
            converted_content = converted_content.replace(chinese_punct, english_punct)
            stats['converted'][chinese_punct] = count
            stats['total_converted'] += count
    
    # 处理特殊标点符号
    # 破折号（——）→ 两个连字符（--）
    dash_count = len(re.findall(r'——', converted_content))
    if dash_count > 0:
        converted_content = re.sub(r'——', '--', converted_content)
        stats['converted']['——'] = dash_count
        stats['total_converted'] += dash_count
    
    # 省略号（……）→ 三个点（...）
    ellipsis_count = len(re.findall(r'……', converted_content))
    if ellipsis_count > 0:
        converted_content = re.sub(r'……', '...', converted_content)
        stats['converted']['……'] = ellipsis_count
        stats['total_converted'] += ellipsis_count
    
    # 书名号《》→ 英文书名号或保留（根据需求）
    # 这里选择替换为英文书名号 <>
    book_title_left_count = converted_content.count('《')
    book_title_right_count = converted_content.count('》')
    if book_title_left_count > 0:
        converted_content = converted_content.replace('《', '<')
        stats['converted']['《'] = book_title_left_count
        stats['total_converted'] += book_title_left_count
    if book_title_right_count > 0:
        converted_content = converted_content.replace('》', '>')
        stats['converted']['》'] = book_title_right_count
        stats['total_converted'] += book_title_right_count
    
    # 写入文件
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(converted_content)
        
        print(f"✓ 标点符号转换完成: {output_file}")
        print(f"  总字符数: {stats['total_chars']}")
        print(f"  转换总数: {stats['total_converted']}")
        print(f"\n  详细转换统计:")
        for punct, count in sorted(stats['converted'].items(), key=lambda x: x[1], reverse=True):
            print(f"    {punct} → {punctuation_map.get(punct, '?')}: {count} 次")
        return True
    except Exception as e:
        print(f"写入文件失败: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("用法: python convert_punctuation.py <文件路径>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    if not Path(input_file).exists():
        print(f"错误: 文件不存在: {input_file}")
        sys.exit(1)
    
    print(f"开始转换标点符号: {input_file}")
    print("-" * 50)
    
    # 创建备份
    backup_file = input_file + '.bak2'
    try:
        import shutil
        shutil.copy2(input_file, backup_file)
        print(f"✓ 已创建备份: {backup_file}")
    except Exception as e:
        print(f"⚠ 创建备份失败: {e}")
    
    # 转换标点符号
    if convert_punctuation(input_file):
        print("\n✓ 处理完成！")
    else:
        print("\n✗ 处理失败！")


if __name__ == '__main__':
    main()

