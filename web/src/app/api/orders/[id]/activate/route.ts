import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { activateOrder } from "@/services/orders";
import { errorResponse } from "@/lib/api-error";

function filesFromForm(form: FormData): File[] {
  return form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const form = await req.formData();
    const order = await activateOrder({
      orderId: id,
      user,
      activatorId: String(form.get("activatorId") ?? ""),
      activateBackend: String(form.get("activateBackend") ?? ""),
      activatedAt: String(form.get("activatedAt") ?? ""),
      lateEntryNote: String(form.get("lateEntryNote") ?? "") || undefined,
      attachmentFiles: filesFromForm(form),
    });
    return NextResponse.json({ order });
  } catch (e) {
    return errorResponse(e, 400, { fallback: "激活失败" });
  }
}
