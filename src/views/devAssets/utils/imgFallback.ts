/**
 * CDN 图片保底回退：
 * 正文中图片统一保存 jsDelivr CDN 地址，push 到 image-cdn 仓库后自动生效；
 * 尚未 push 时 CDN 加载失败，这里自动回退到后端本地直出接口 /geeker/file/img/{文件名}。
 * error 事件不冒泡，需用捕获阶段在容器上委托监听。
 */
const CDN_PREFIX = "https://cdn.jsdelivr.net/gh/pcl1350306170/image-cdn@refs/heads/main/Upload/";
const LOCAL_PREFIX = "/api/geeker/file/img/";

export const setupImgCdnFallback = (container: HTMLElement) => {
  container.addEventListener(
    "error",
    e => {
      const img = e.target as HTMLImageElement;
      if (img.tagName !== "IMG" || !img.src.startsWith(CDN_PREFIX)) return;
      // 只回退一次，避免本地也不存在时无限重试
      if (img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.src = LOCAL_PREFIX + img.src.substring(img.src.lastIndexOf("/") + 1);
    },
    true
  );
};
