import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { refundOrder } from "@/services/orders";
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
    const reason = String(form.get("refundReason") ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "请填写退单原因" }, { status: 400 });
    }
    const order = await refundOrder({
      orderId: id,
      user,
      refundReason: reason,
      refundNote: String(form.get("refundNote") ?? "").trim() || undefined,
      attachmentFiles: filesFromForm(form),
    });
    return NextResponse.json({ order });
  } catch (e) {
    return errorResponse(e, 400, { fallback: "退单失败" });
  }
}
