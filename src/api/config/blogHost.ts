/**
 * blog 后端基础地址解析
 * ------------------------------------------------------------
 * 复用于所有"前端在 Geeker、接口仍打 blog"的功能。
 * - dev ：走 vite 代理前缀（.env.development 的 VITE_BLOG_API_URL=/blog-api + VITE_PROXY）
 * - prod：直连 blog 绝对地址；未显式配置时，按当前访问域名自动拼接后端端口（思路同 blog 的 _variable.js）
 */
const BLOG_PORT = 28019;

function resolveBlogBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_BLOG_API_URL as string | undefined)?.trim();
  // 显式配置优先（dev 为代理前缀 /blog-api，prod 可填完整地址）
  if (envUrl) return envUrl.replace(/\/$/, "");

  // 兜底：按当前页面 host 拼接 blog 后端端口
  try {
    const { hostname, protocol } = new URL(window.location.href);
    if (hostname === "localhost" || hostname === "127.0.0.1") return `http://localhost:${BLOG_PORT}`;
    return `${protocol}//${hostname}:${BLOG_PORT}`;
  } catch {
    return `http://localhost:${BLOG_PORT}`;
  }
}

/** blog 后端基础地址（不含末尾斜杠） */
export const BLOG_BASE_URL = resolveBlogBaseUrl();

/** 拼接 blog 完整接口地址：blogUrl("/api/v1/general-data/save") */
export const blogUrl = (path = ""): string => {
  if (!path) return BLOG_BASE_URL;
  return `${BLOG_BASE_URL}/${path.replace(/^\//, "")}`;
};
