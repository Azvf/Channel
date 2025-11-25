/**
 * Typography System
 * 字体系统定义
 */

export const TYPOGRAPHY = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  styles: {
    headerTitle: {
      weight: 700,
      size: { rem: 1, px: 16 },
      lineHeight: 1.35,
      letterSpacing: { em: -0.02 },
      description: '应用标题',
    },
    pageTitle: {
      weight: 600,
      size: { rem: 1.1, px: 17.6 },
      lineHeight: 1.35,
      letterSpacing: { em: -0.015 },
      description: '页面/卡片标题',
    },
    body: {
      weight: 400,
      size: { rem: 0.85, px: 13.6 },
      lineHeight: 1.4,
      letterSpacing: { em: 0.01 },
      description: '正文内容',
    },
    listItem: {
      weight: 500,
      size: { rem: 0.9, px: 14.4 },
      lineHeight: 1.4,
      letterSpacing: { em: 0 },
      description: '列表项文本',
    },
    caption: {
      weight: 400,
      size: { rem: 0.8, px: 12.8 },
      lineHeight: 1.4,
      letterSpacing: { em: 0.005 },
      description: '辅助说明',
    },
    tag: {
      weight: 500,
      size: { rem: 0.75, px: 12 },
      lineHeight: 1.4,
      letterSpacing: { em: 0.01 },
      description: '标签文字',
    },
    micro: {
      weight: 500,
      size: { rem: 0.6, px: 9.6 },
      lineHeight: 1,
      letterSpacing: { em: 0 },
      description: '热力图标签',
    },
  },
} as const;

