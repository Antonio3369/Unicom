const UPLOAD_PROGRESS_MAX = 30;
const PROCESSING_PROGRESS_MAX = 99;

export type XhrProgressHandler = (value: number, label: string) => void;

function clearTimer(timer: ReturnType<typeof setInterval> | null) {
  if (timer) clearInterval(timer);
}

function startProcessingProgress(onProgress: XhrProgressHandler) {
  let current = UPLOAD_PROGRESS_MAX;
  const startedAt = Date.now();
  onProgress(current, "正在解析并写入…");
  return setInterval(() => {
    if (current < PROCESSING_PROGRESS_MAX) {
      const step = current < 55 ? 2.5 : current < 80 ? 1.2 : current < 92 ? 0.4 : 0.15;
      current = Math.min(PROCESSING_PROGRESS_MAX, current + step);
    }
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
    let label = "正在解析并写入…";
    if (elapsedSec >= 90) {
      label = `即将完成…已用时 ${elapsedSec}s，请勿关闭页面`;
    } else if (elapsedSec >= 20) {
      label = `正在处理…已用时 ${elapsedSec}s（大文件可能需 1–2 分钟）`;
    }
    onProgress(Math.round(current), label);
  }, 350);
}

export function xhrForm<T>(
  url: string,
  method: "POST" | "PUT",
  formData: FormData | null,
  onProgress: XhrProgressHandler
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let processingTimer: ReturnType<typeof setInterval> | null = null;
    let processingStarted = false;

    function cleanup() {
      clearTimer(processingTimer);
      processingTimer = null;
    }

    function beginProcessing() {
      if (processingStarted) return;
      processingStarted = true;
      processingTimer = startProcessingProgress(onProgress);
    }

    if (formData) {
      xhr.upload.onprogress = (event) => {
        if (processingStarted) return;
        if (!event.lengthComputable) {
          onProgress(8, "正在上传文件…");
          return;
        }
        const ratio = event.total > 0 ? event.loaded / event.total : 0;
        onProgress(
          Math.max(1, Math.round(ratio * UPLOAD_PROGRESS_MAX)),
          `正在上传文件… ${Math.round(ratio * 100)}%`
        );
      };
      xhr.upload.onload = () => beginProcessing();
    } else {
      onProgress(10, "正在读取本地 data…");
      beginProcessing();
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onProgress(100, "完成");
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new Error("响应解析失败"));
        }
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText) as { error?: string };
        reject(new Error(data.error ?? "请求失败"));
      } catch {
        reject(new Error(xhr.status === 0 ? "网络错误，请确认本地服务已启动" : "请求失败"));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("网络错误，请确认本地服务已启动"));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new Error("处理超时（超过 5 分钟），请稍后重试"));
    };

    xhr.timeout = 5 * 60 * 1000;
    xhr.open(method, url);
    xhr.send(formData);
  });
}
