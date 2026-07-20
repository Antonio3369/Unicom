import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { AttachmentKind } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/permissions";
import { validateAttachmentFiles } from "@/lib/order-attachments";
import { getOrderForUser } from "@/services/orders";

export async function saveOrderAttachments(input: {
  orderId: string;
  user: SessionUser;
  kind: AttachmentKind;
  files: File[];
}) {
  await getOrderForUser(input.orderId, input.user);
  validateAttachmentFiles(input.files);

  const uploadRoot = path.join(process.cwd(), "uploads", "orders", input.orderId);
  await mkdir(uploadRoot, { recursive: true });

  const records = [];
  for (const file of input.files) {
    const ext = path.extname(file.name) || ".jpg";
    const storageName = `${randomUUID()}${ext}`;
    const storagePath = path.join(uploadRoot, storageName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);
    records.push({
      orderId: input.orderId,
      kind: input.kind,
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
      storagePath,
      uploadedById: input.user.id,
    });
  }

  await db.orderAttachment.createMany({ data: records });
  return db.orderAttachment.findMany({
    where: { orderId: input.orderId, kind: input.kind },
    orderBy: { createdAt: "asc" },
  });
}

export async function listOrderAttachments(orderId: string, user: SessionUser) {
  await getOrderForUser(orderId, user);
  return db.orderAttachment.findMany({
    where: { orderId },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    include: { uploadedBy: { select: { name: true } } },
  });
}

export async function getAttachmentForUser(attachmentId: string, user: SessionUser) {
  const attachment = await db.orderAttachment.findUnique({
    where: { id: attachmentId },
    include: { order: { select: { openerId: true } } },
  });
  if (!attachment) throw new Error("附件不存在");
  await getOrderForUser(attachment.orderId, user);
  return attachment;
}
