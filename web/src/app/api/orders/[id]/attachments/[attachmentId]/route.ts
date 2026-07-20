import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getSessionUser } from "@/lib/session";
import { getAttachmentForUser } from "@/services/order-attachments";
import { errorResponse } from "@/lib/api-error";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { attachmentId } = await ctx.params;
  try {
    const attachment = await getAttachmentForUser(attachmentId, user);
    const data = await readFile(attachment.storagePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    return errorResponse(e, 404, { fallback: "附件不存在" });
  }
}
