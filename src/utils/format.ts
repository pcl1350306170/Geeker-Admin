/**
 * @description 通用格式化工具
 */

/**
 * 格式化后端 LocalDateTime 字符串（"2026-09-17T12:00:00"）为 "2026-09-17 12:00"
 */
export const formatTime = (time?: string | null): string => {
  if (!time) return "-";
  return time.replace("T", " ").slice(0, 16);
};

/**
 * 格式化后端 LocalDateTime 字符串为日期（"2026-09-17"）
 */
export const formatDate = (time?: string | null): string => {
  if (!time) return "-";
  return time.slice(0, 10);
};
