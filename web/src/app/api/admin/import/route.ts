import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canImportExcel } from "@/lib/permissions";
import { importPersonnelFile } from "@/services/import/personnel-importer";
import { importOrdersFile, runExpirationBatch } from "@/services/import/orders-importer";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

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
  const filePath = path.join(uploadDir, `${Date.now()}_${file.name}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  try {
    if (type === "personnel") {
      const result = await importPersonnelFile(filePath, "罗湖");
      return NextResponse.json({ ok: true, result });
    }
    if (type === "orders") {
      const result = await importOrdersFile(filePath);
      await runExpirationBatch();
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ error: "未知导入类型" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT() {
  const user = await getSessionUser();
  if (!user || !canImportExcel(user.role)) {
    return NextResponse.json({ error: "无权导入" }, { status: 403 });
  }

  const personnelFile = path.resolve(process.cwd(), process.env.PERSONNEL_FILE ?? "../data/罗湖联通业务员名单.xlsx");
  const ordersFile = path.resolve(process.cwd(), process.env.ORDERS_FILE ?? "../data/业绩登记模版-上传数据系统.xlsx");

  const personnel = await importPersonnelFile(personnelFile, "罗湖");
  const orders = await importOrdersFile(ordersFile);
  const expired = await runExpirationBatch();
  return NextResponse.json({ ok: true, personnel, orders, expired });
}
