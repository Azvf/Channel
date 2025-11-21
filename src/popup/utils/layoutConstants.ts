/**
 * Layout Constants
 * 
 * Shared constants for layout calculations in JavaScript/TypeScript.
 * These values are semantically aligned with CSS Token system to maintain
 * design system consistency.
 * 
 * Note: While reading CSS variables in JS has performance overhead,
 * these constants serve as a bridge for layout calculations that cannot
 * be done purely in CSS (e.g., dynamic positioning, viewport calculations).
 */

/**
 * Spacing Constants
 * Aligned with --space-* tokens (4px grid system)
 */
export const SPACE = {
  /** 4px - var(--space-1) */
  SPACE_1: 4,
  /** 6px - var(--space-1_5) */
  SPACE_1_5: 6,
  /** 8px - var(--space-2) */
  SPACE_2: 8,
  /** 12px - var(--space-3) */
  SPACE_3: 12,
  /** 16px - var(--space-4) */
  SPACE_4: 16,
} as const;

/**
 * Layout Dimensions
 * Aligned with Layout Constants in tokens.css
 */
export const LAYOUT = {
  /** 44px - var(--row-min-height) */
  ROW_MIN_HEIGHT: 44,
  /** 80px - var(--textarea-min-height) */
  TEXTAREA_MIN_HEIGHT: 80,
  /** 150px - var(--menu-min-width) */
  MENU_MIN_WIDTH: 150,
} as const;

/**
 * Tooltip & Dropdown Positioning
 * Used for dynamic positioning calculations
 */
export const POSITIONING = {
  /** 8px - Safe margin for viewport edges (aligned with --space-2) */
  VIEWPORT_MARGIN: SPACE.SPACE_2,
  /** 6px - Tooltip offset from trigger (aligned with --tooltip-offset) */
  TOOLTIP_OFFSET: 6,
  /** 8px - Dropdown offset from anchor (aligned with --space-2) */
  DROPDOWN_OFFSET: SPACE.SPACE_2,
} as const;

