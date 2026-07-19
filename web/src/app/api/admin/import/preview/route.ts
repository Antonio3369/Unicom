import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canImportExcel } from "@/lib/permissions";
import { previewPersonnelFile } from "@/services/import/personnel-importer";
import { previewOrdersFile } from "@/services/import/orders-importer";
import path from "path";
import { writeFile, mkdir, access } from "fs/promises";
import { errorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !canImportExcel(user.role)) {
    return NextResponse.json({ error: "无权导入" }, { status: 403 });
  }

  const form = await req.formData();
  const type = String(form.get("type") ?? "");
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, `${Date.now()}_preview_${file.name}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  try {
    if (type === "personnel") {
      const result = await previewPersonnelFile(filePath, "罗湖");
      return NextResponse.json({ ok: true, preview: true, type, result });
    }
    if (type === "orders") {
      const result = await previewOrdersFile(filePath);
      return NextResponse.json({ ok: true, preview: true, type, result });
    }
    return NextResponse.json({ error: "未知导入类型" }, { status: 400 });
  } catch (e) {
    return errorResponse(e, 500, { fallback: "预览失败，请确认 Excel 格式正确" });
  }
}

export async function PUT() {
  const user = await getSessionUser();
  if (!user || !canImportExcel(user.role)) {
    return NextResponse.json({ error: "无权导入" }, { status: 403 });
  }

  const personnelFile = path.resolve(
    process.cwd(),
    process.env.PERSONNEL_FILE ?? "./data/罗湖联通业务员名单.xlsx"
  );
  const ordersFile = path.resolve(
    process.cwd(),
    process.env.ORDERS_FILE ?? "./data/业绩登记模版-上传数据系统.xlsx"
  );

  try {
    await access(personnelFile);
    await access(ordersFile);
    const personnel = await previewPersonnelFile(personnelFile, "罗湖");
    const orders = await previewOrdersFile(ordersFile);
    return NextResponse.json({
      ok: true,
      preview: true,
      type: "seed",
      personnel,
      orders,
    });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return NextResponse.json(
        {
          error: `缺少数据文件，请确认存在：${personnelFile} 与 ${ordersFile}`,
        },
        { status: 500 }
      );
    }
    return errorResponse(e, 500, { fallback: "预览失败，请确认 Excel 格式正确" });
  }
}
