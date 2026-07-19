import { pinyin } from "pinyin-pro";
import { db } from "@/lib/db";

/** 中文名 → 小写无声调拼音，如 林豪 → linhao；邓秀芸 → dengxiuyun */
export function nameToPinyinUsername(name: string): string {
  const base = pinyin(name.trim(), {
    toneType: "none",
    type: "array",
    nonZh: "removed",
  })
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return base || `user${Date.now().toString(36)}`;
}

/**
 * 生成唯一登录名：默认拼音；冲突则 linhao2、linhao3…
 * excludeUserId：更新本人时排除自己
 */
export async function allocatePinyinUsername(
  name: string,
  excludeUserId?: string
): Promise<string> {
  const base = nameToPinyinUsername(name);
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await db.user.findUnique({ where: { username: candidate } });
    if (!existing || existing.id === excludeUserId) return candidate;
    n += 1;
    candidate = `${base}${n}`;
  }
}
