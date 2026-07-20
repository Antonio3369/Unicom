export const ATTACHMENT_MAX_COUNT = 3;
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function validateAttachmentFiles(files: File[]) {
  if (files.length < 1) {
    throw new Error("请至少上传 1 张图片");
  }
  if (files.length > ATTACHMENT_MAX_COUNT) {
    throw new Error(`最多上传 ${ATTACHMENT_MAX_COUNT} 张图片`);
  }
  for (const file of files) {
    if (!ALLOWED_IMAGE_MIMES.has(file.type) && !/^image\//i.test(file.type)) {
      throw new Error(`不支持的文件类型：${file.name}`);
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      throw new Error(`单张图片不能超过 ${ATTACHMENT_MAX_BYTES / 1024 / 1024}MB`);
    }
  }
}
