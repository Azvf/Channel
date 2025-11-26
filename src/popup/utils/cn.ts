import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并类名工具函数
 * 结合 clsx 和 tailwind-merge，用于条件类名和 Tailwind 类名冲突处理
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


