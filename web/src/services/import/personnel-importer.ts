import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/client";
import { allocatePinyinUsername } from "@/lib/username";

export interface PersonnelImportResult {
  managersCreated: number;
  salesCreated: number;
  salesUpdated: number;
}

const DEFAULT_PASSWORD = "123456";

export async function importPersonnelFile(
  filePath: string,
  region = "罗湖"
): Promise<PersonnelImportResult> {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  let managersCreated = 0;
  let salesCreated = 0;
  let salesUpdated = 0;
  const managerMap = new Map<string, string>();
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const row of rows) {
    const salesName = String(row["业务员"] ?? row[Object.keys(row)[0]!] ?? "").trim();
    const managerName = String(row["所属经理"] ?? row[Object.keys(row)[1]!] ?? "").trim();
    if (!salesName || salesName === "业务员" || !managerName || managerName === "所属经理") {
      continue;
    }

    let managerId = managerMap.get(managerName);
    if (!managerId) {
      const existing = await db.user.findFirst({
        where: { name: managerName, role: "MANAGER" },
      });
      if (existing) {
        const username = await allocatePinyinUsername(managerName, existing.id);
        await db.user.update({
          where: { id: existing.id },
          data: { region, username },
        });
        managerId = existing.id;
      } else {
        const username = await allocatePinyinUsername(managerName);
        const created = await db.user.create({
          data: {
            username,
            passwordHash: hash,
            name: managerName,
            role: "MANAGER",
            region,
            mustChangePassword: true,
          },
        });
        managerId = created.id;
        managersCreated++;
      }
      managerMap.set(managerName, managerId);
    }

    const existingSales = await db.user.findFirst({
      where: { name: salesName, role: "SALES" },
    });
    if (existingSales) {
      const username = await allocatePinyinUsername(salesName, existingSales.id);
      await db.user.update({
        where: { id: existingSales.id },
        data: { managerId, region, username },
      });
      salesUpdated++;
    } else {
      const username = await allocatePinyinUsername(salesName);
      await db.user.create({
        data: {
          username,
          passwordHash: hash,
          name: salesName,
          role: "SALES" as UserRole,
          managerId,
          region,
          mustChangePassword: true,
        },
      });
      salesCreated++;
    }
  }

  return { managersCreated, salesCreated, salesUpdated };
}
