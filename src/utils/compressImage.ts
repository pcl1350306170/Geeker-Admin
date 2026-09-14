/**
 * @description 图片压缩工具（基于 Canvas）
 * 在上传前将图片压缩到目标大小以内，避免触发服务端请求体限制
 */

/** 默认目标大小：1MB */
const DEFAULT_TARGET_SIZE = 1024 * 1024;

/** 压缩质量递减步长 */
const QUALITY_STEP = 0.1;

/** 最低压缩质量 */
const MIN_QUALITY = 0.1;

/** 最大边长限制（超过此值会等比缩放） */
const MAX_DIMENSION = 1920;

/**
 * 压缩图片文件到目标大小以内
 * @param file 原始图片文件
 * @param targetSize 目标最大字节数（默认 1MB）
 * @returns 压缩后的 File 对象（若无需压缩则原样返回）
 */
export function compressImage(file: File, targetSize: number = DEFAULT_TARGET_SIZE): Promise<File> {
  // 已经小于目标大小，直接返回
  if (file.size <= targetSize) return Promise.resolve(file);

  // GIF 不支持 Canvas 压缩（会丢失动画），直接返回原文件
  if (file.type === "image/gif") return Promise.resolve(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.onload = () => {
        try {
          // 计算缩放尺寸
          let { width, height } = img;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height / width) * MAX_DIMENSION);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width / height) * MAX_DIMENSION);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);

          // 从 0.9 质量开始逐步降低，直到满足目标大小
          let quality = 0.9;
          const tryCompress = (): void => {
            canvas.toBlob(
              blob => {
                if (!blob) {
                  // 压缩失败，返回原文件
                  resolve(file);
                  return;
                }
                if (blob.size <= targetSize || quality <= MIN_QUALITY) {
                  const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
                  resolve(compressedFile);
                } else {
                  quality = Math.round((quality - QUALITY_STEP) * 10) / 10;
                  tryCompress();
                }
              },
              "image/jpeg",
              quality
            );
          };

          tryCompress();
        } catch {
          // Canvas 操作异常，降级返回原文件
          resolve(file);
        }
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
