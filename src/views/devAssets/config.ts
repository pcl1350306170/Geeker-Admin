/**
 * 开发资产库公共配置（类型 / 语言字典）
 */

// 资产类型字典
export const ASSET_TYPE_OPTIONS = [
  { label: "代码", value: "CODE" },
  { label: "定制方案", value: "SOLUTION" },
  { label: "踩坑记录", value: "TROUBLESHOOTING" },
  { label: "脚本/流程", value: "PROCEDURE" },
  { label: "Snippet", value: "SNIPPET" }
];

// 类型 => 中文标签
export const ASSET_TYPE_MAP: Record<string, string> = Object.fromEntries(
  ASSET_TYPE_OPTIONS.map(item => [item.value, item.label])
);

// 类型 => ElTag 颜色
export const ASSET_TYPE_TAG_TYPE: Record<string, string> = {
  CODE: "primary",
  SOLUTION: "success",
  TROUBLESHOOTING: "danger",
  PROCEDURE: "warning",
  SNIPPET: "info"
};

// 代码语言字典
export const LANGUAGE_OPTIONS = [
  "javascript",
  "typescript",
  "vue",
  "css",
  "scss",
  "html",
  "java",
  "sql",
  "shell",
  "json",
  "arkts"
];

// 常用标签建议列表
export const SUGGEST_TAGS = [
  "Vue3",
  "Vue2",
  "JavaScript",
  "TypeScript",
  "CSS",
  "SCSS",
  "ArkTS",
  "HarmonyOS",
  "Sortable",
  "Git",
  "Node",
  "Linux",
  "Docker"
];
