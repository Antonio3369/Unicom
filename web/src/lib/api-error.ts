import { NextResponse } from "next/server";
import { PermissionError } from "@/lib/permissions";

const TECH_MESSAGE =
  /Prisma|invocation|__TURBOPACK__|Invalid `.*` invocation|ECONNREFUSED|EPERM/i;

type UserErrorOptions = {
  fallback?: string;
};

/** 将异常转为可展示给用户的中文说明（过滤 Prisma / 堆栈等技术信息） */
export function toUserError(e: unknown, options: UserErrorOptions = {}): string {
  const fallback = options.fallback ?? "操作失败，请稍后重试";

  if (e instanceof PermissionError) return e.message;

  const err = e as NodeJS.ErrnoException & Error;
  if (err.code === "ENOENT") {
    return "找不到所需文件，请确认已上传或 data 目录中存在样例表。";
  }

  const msg = err.message?.trim();
  if (!msg) return fallback;

  if (TECH_MESSAGE.test(msg)) {
    return "服务暂时异常，请刷新页面；若刚改过数据库结构，请重启开发服务后重试。";
  }
  if (/Cannot access file/i.test(msg)) {
    return "无法读取 Excel 文件，请重新选择后上传。";
  }

  return msg;
}

export function errorResponse(
  e: unknown,
  status = 400,
  options?: UserErrorOptions
) {
  return NextResponse.json({ error: toUserError(e, options) }, { status });
}

/** 从 fetch 响应解析 API 错误文案（客户端） */
export async function readApiError(
  res: Response,
  fallback = "请求失败"
): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    if (res.status === 401) return "未登录，请重新登录";
    if (res.status === 403) return "无权执行此操作";
    return res.ok ? fallback : "网络异常，请确认本地服务已启动";
  }
  return fallback;
}

export function networkErrorMessage(e: unknown, fallback = "网络异常，请确认本地服务已启动") {
  if (e instanceof Error && e.message && !TECH_MESSAGE.test(e.message)) {
    return e.message;
  }
  return fallback;
}
