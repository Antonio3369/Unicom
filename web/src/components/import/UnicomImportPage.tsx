"use client";

import { useState } from "react";
import {
  NotionAlert,
  NotionButton,
  NotionCallout,
  NotionPanel,
  NotionProgressBar,
  NotionTabs,
  PageHeader,
  PageShell,
} from "@/components/ui/notion";
import { xhrForm } from "@/lib/import-upload";
import { networkErrorMessage } from "@/lib/api-error";
import type { PersonnelImportResult } from "@/services/import/personnel-importer";
import type { OrdersImportPreview } from "@/services/import/orders-importer";
import {
  formatOrdersSummary,
  formatPersonnelSummary,
  formatPreviewTitle,
  formatSeedSummary,
} from "@/services/import/import-summary";

type ImportKind = "personnel" | "orders" | "seed";

type PreviewState =
  | { kind: "personnel"; file: File; result: PersonnelImportResult }
  | { kind: "orders"; file: File; result: OrdersImportPreview }
  | { kind: "seed"; result: { personnel: PersonnelImportResult; orders: OrdersImportPreview } };

const IMPORT_CONFIG: Record<
  ImportKind,
  { title: string; description: string; needsFile: boolean; previewLabel: string; confirmLabel: string }
> = {
  personnel: {
    title: "人员名单",
    description:
      "上传「罗湖联通业务员名单.xlsx」。表头需含业务员、所属经理。创建/更新经理与队员登录账号（默认密码 123456）。建议先导人员，再导业绩。",
    needsFile: true,
    previewLabel: "预览人员名单",
    confirmLabel: "确认写入人员名单",
  },
  orders: {
    title: "业绩登记",
    description:
      "上传业绩登记 Excel。按手机号+办理日+开单人对账；待激活/已过期改「已完成」可补录。写入后会跑过期批处理。已完成/已退单不会被覆盖。",
    needsFile: true,
    previewLabel: "预览业绩登记",
    confirmLabel: "确认写入业绩登记",
  },
  seed: {
    title: "本地 data 目录",
    description:
      "开发用：读取 web/data 或 .env 配置的样例文件（与 seed 相同）。正式运营请用上方 Tab 直接上传 Excel。",
    needsFile: false,
    previewLabel: "预览本地 data",
    confirmLabel: "确认写入本地 data",
  },
};

const FILE_INPUT_CLASS =
  "block w-full text-sm text-[#64748b] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#2563eb] file:text-white file:cursor-pointer disabled:opacity-60";

export function UnicomImportPage() {
  const [kind, setKind] = useState<ImportKind>("personnel");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [result, setResult] = useState<{ ok: true; text: string } | { ok: false; text: string } | null>(
    null
  );

  const config = IMPORT_CONFIG[kind];

  function switchKind(next: ImportKind) {
    if (loading) return;
    setKind(next);
    setFile(null);
    setPreview(null);
    setResult(null);
    setProgress(0);
    setProgressLabel("");
  }

  function previewSummary(): string {
    if (!preview) return "";
    if (preview.kind === "personnel") return formatPersonnelSummary(preview.result);
    if (preview.kind === "orders") return formatOrdersSummary(preview.result);
    return [
      formatPersonnelSummary(preview.result.personnel),
      formatOrdersSummary(preview.result.orders),
    ].join("\n\n");
  }

  async function runPreview() {
    if (config.needsFile && !file) return;
    setLoading(true);
    setResult(null);
    setPreview(null);
    setProgress(0);
    setProgressLabel("准备预览…");

    try {
      if (kind === "seed") {
        const data = await xhrForm<{
          personnel: PersonnelImportResult;
          orders: OrdersImportPreview;
        }>("/api/admin/import/preview", "PUT", null, (value, label) => {
          setProgress(value);
          setProgressLabel(label);
        });
        setPreview({ kind: "seed", result: { personnel: data.personnel, orders: data.orders } });
        return;
      }

      const form = new FormData();
      form.set("type", kind);
      form.set("file", file!);
      const data = await xhrForm<{ result: PersonnelImportResult | OrdersImportPreview }>(
        "/api/admin/import/preview",
        "POST",
        form,
        (value, label) => {
          setProgress(value);
          setProgressLabel(label);
        }
      );
      if (kind === "personnel") {
        setPreview({
          kind: "personnel",
          file: file!,
          result: data.result as PersonnelImportResult,
        });
      } else {
        setPreview({
          kind: "orders",
          file: file!,
          result: data.result as OrdersImportPreview,
        });
      }
    } catch (e) {
      setResult({ ok: false, text: networkErrorMessage(e, "预览失败") });
      setProgress(0);
      setProgressLabel("");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setLoading(true);
    setResult(null);
    setProgress(0);
    setProgressLabel("准备写入…");

    try {
      if (preview.kind === "seed") {
        const data = await xhrForm<{
          personnel: PersonnelImportResult;
          orders: OrdersImportPreview;
          expired: number;
        }>("/api/admin/import", "PUT", null, (value, label) => {
          setProgress(value);
          setProgressLabel(label);
        });
        setPreview(null);
        setResult({ ok: true, text: formatSeedSummary(data) });
        return;
      }

      const form = new FormData();
      form.set("type", preview.kind);
      form.set("file", preview.file);
      if (preview.kind === "personnel") {
        const data = await xhrForm<{ result: PersonnelImportResult }>(
          "/api/admin/import",
          "POST",
          form,
          (value, label) => {
            setProgress(value);
            setProgressLabel(label);
          }
        );
        setPreview(null);
        setFile(null);
        setResult({ ok: true, text: formatPersonnelSummary(data.result) });
      } else {
        const data = await xhrForm<{ result: OrdersImportPreview; batchExpired?: number }>(
          "/api/admin/import",
          "POST",
          form,
          (value, label) => {
            setProgress(value);
            setProgressLabel(label);
          }
        );
        setPreview(null);
        setFile(null);
        setResult({
          ok: true,
          text: formatOrdersSummary({
            ...data.result,
            batchExpireRows: data.batchExpired ?? 0,
          }),
        });
      }
    } catch (e) {
      setResult({ ok: false, text: networkErrorMessage(e, "导入失败") });
      setProgress(0);
      setProgressLabel("");
    } finally {
      setLoading(false);
    }
  }

  function cancelPreview() {
    setPreview(null);
  }

  return (
    <PageShell>
      <PageHeader
        title="导入对账"
        meta="本地沙箱可直接上传 Excel · 先人员后业绩 · 写入前预览确认"
      />

      <NotionCallout>
        <p>· 本地 http://localhost:1771 选文件上传即可，不依赖服务器 data 目录</p>
        <p>· Excel 把「待激活/已过期」改成「已完成」再传 → 系统升为已完成（补录）</p>
        <p>· 已完成 / 已退单不会被 Excel 冲掉</p>
      </NotionCallout>

      <NotionTabs
        tabs={[
          { key: "personnel", label: "人员名单" },
          { key: "orders", label: "业绩登记" },
          { key: "seed", label: "本地 data" },
        ]}
        active={kind}
        onChange={switchKind}
        disabled={loading}
      />

      <NotionPanel className="max-w-xl space-y-4">
        <div>
          <h2 className="text-sm font-medium text-[#111827]">{config.title}</h2>
          <p className="mt-1 text-sm text-[#64748b]">{config.description}</p>
        </div>

        {config.needsFile && (
          <input
            type="file"
            accept=".xlsx,.xls"
            key={kind}
            disabled={loading}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
            className={FILE_INPUT_CLASS}
          />
        )}

        {loading && (
          <NotionProgressBar value={progress} label={progressLabel || "处理中…"} />
        )}

        {!preview && (
          <NotionButton
            disabled={loading || (config.needsFile && !file)}
            onClick={() => void runPreview()}
          >
            {loading ? "处理中…" : config.previewLabel}
          </NotionButton>
        )}

        {preview && !loading && (
          <NotionAlert tone="info">
            <p className="font-medium">{formatPreviewTitle(preview.kind)}</p>
            <p className="whitespace-pre-wrap mt-2">{previewSummary()}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <NotionButton onClick={() => void confirmImport()}>{config.confirmLabel}</NotionButton>
              <NotionButton variant="ghost" onClick={cancelPreview}>
                取消
              </NotionButton>
            </div>
          </NotionAlert>
        )}

        {result && !loading && (
          <NotionAlert tone={result.ok ? "success" : "error"}>
            <p className="font-medium mb-1">{result.ok ? "导入完成" : "导入失败"}</p>
            <p className="whitespace-pre-wrap">{result.text}</p>
          </NotionAlert>
        )}
      </NotionPanel>
    </PageShell>
  );
}
