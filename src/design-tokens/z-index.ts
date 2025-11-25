/**
 * Z-Index Scale - Semantic Elevation
 * Z轴层级系统，语义化高度
 */

export const Z_INDEX = {
  hidden: -1,
  base: 1,
  content: 2,
  sticky: 10,
  appHeader: 20,
  dropdown: 30,
  dropdownContent: 31,
  modalBackdrop: 40,
  modalContent: 41,
  tooltip: 50,
  contextMenuBackdrop: 60,
  contextMenuBody: 61,
  toast: 100,
  cursorDrag: 1000,
} as const;

