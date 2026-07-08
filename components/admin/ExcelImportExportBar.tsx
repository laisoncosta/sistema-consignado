"use client";

import { Download, Loader2, Upload } from "lucide-react";
import { useRef, type CSSProperties } from "react";

import type { BrandTheme } from "@/lib/brands";

type ExcelImportExportBarProps = {
  brand: BrandTheme;
  exportando?: boolean;
  importando?: boolean;
  mensagem?: string | null;
  erro?: string | null;
  onExportar: () => void | Promise<void>;
  onImportar: (arquivo: File) => void | Promise<void>;
};

export function ExcelImportExportBar({
  brand,
  exportando = false,
  importando = false,
  mensagem,
  erro,
  onExportar,
  onImportar,
}: ExcelImportExportBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;
  const ocupado = exportando || importando;

  async function handleArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";

    if (!arquivo) {
      return;
    }

    await onImportar(arquivo);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void onExportar()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {exportando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar Excel
        </button>

        <button
          type="button"
          disabled={ocupado}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          style={inputRingStyle}
        >
          {importando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Importar Excel
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => void handleArquivo(event)}
        />
      </div>

      {mensagem ? (
        <p className="text-xs font-medium text-emerald-700">{mensagem}</p>
      ) : null}
      {erro ? (
        <p className="text-xs font-medium text-red-600">{erro}</p>
      ) : null}
    </div>
  );
}
