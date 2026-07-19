import { readFile } from "fs/promises";
import * as XLSX from "xlsx";

export async function readExcelWorkbook(filePath: string) {
  const data = await readFile(filePath);
  return XLSX.read(data, { type: "buffer" });
}

export function parseRemark(remark: unknown): {
  carrier: "UNICOM" | "MOBILE" | "OTHER" | null;
  backend: string | null;
  rest: string | null;
} {
  if (remark == null || remark === "") {
    return { carrier: null, backend: null, rest: null };
  }
  const s = String(remark).trim();
  let carrier: "UNICOM" | "MOBILE" | "OTHER" | null = null;
  if (s.includes("移动")) carrier = "MOBILE";
  else if (s.includes("联通")) carrier = "UNICOM";

  const backendMatch = s.match(/([\u4e00-\u9fff]+后台)/);
  const backend = backendMatch?.[1] ?? null;

  return { carrier, backend, rest: s };
}

export function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/\s/g, "").trim();
}

export function normalizeSurname(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s || s === "(未提供)") return s;
  return s.slice(0, 1);
}

export function buildImportKey(phone: string, handleDate: Date, openerId: string): string {
  return `${phone}_${handleDate.toISOString().slice(0, 10)}_${openerId}`;
}
