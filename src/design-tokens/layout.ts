/**
 * Layout Constants
 * 布局常量定义
 */

export const LAYOUT = {
  headerHeight: { px: 60 },
  rowMinHeight: { px: 44, description: 'Touch-friendly target (Apple标准)' },
  controlHeightSm: { px: 32, description: '次要按钮' },
  controlHeightMd: { px: 44, description: '标准输入框/按钮' },
  controlHeightLg: { px: 56, description: '主要CTA、底部栏' },
  modalMaxWidth: { px: 360, description: '保持单手可控' },
  modalMaxHeight: { vh: 90 },
  statsWallMaxWidth: { px: 560 },
  dropdownMaxHeight: { px: 240 },
  menuMinWidth: { px: 150 },
  textareaMinHeight: { px: 80 },
  calendarCellSize: { px: 24 },
  calendarDayLabelWidth: { px: 30 },
  calendarLegendSquareSize: { px: 10 },
} as const;

