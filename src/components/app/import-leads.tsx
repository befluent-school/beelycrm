"use client";

import * as XLSX from "xlsx";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download, Upload, ArrowRight, CheckCircle2,
  FileSpreadsheet, Eye, Loader2, Table2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, DEFAULT_OWNER } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ── Campos do sistema ──────────────────────────────────────── */
const SYSTEM_FIELDS = [
  { key: "name",        label: "Nome do Lead",           required: true  },
  { key: "phone",       label: "Telefone / Celular",      required: false },
  { key: "email",       label: "E-mail",                  required: false },
  { key: "source",      label: "Origem",                  required: false },
  { key: "campaign",    label: "Campanha",                required: false },
  { key: "stage",       label: "Etapa do Funil",          required: false },
  { key: "owner",       label: "Responsavel",             required: false },
  { key: "company",     label: "Empresa / Razao Social",  required: false },
  { key: "product",     label: "Produto de Interesse",    required: false },
  { key: "value",       label: "Valor (R$)",              required: false },
  { key: "tags",        label: "Etiquetas (separadas ;)", required: false },
  { key: "city",        label: "Cidade",                  required: false },
  { key: "state",       label: "Estado",                  required: false },
  { key: "notes",       label: "Anotacoes / Descricao",   required: false },
  { key: "utm_source",  label: "UTM Source",              required: false },
  { key: "utm_campaign",label: "UTM Campaign",            required: false },
] as const;

type FieldKey = (typeof SYSTEM_FIELDS)[number]["key"];

/* ── Mapeamento automático ──────────────────────────────────── */
function guessMapping(header: string): FieldKey | "" {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (h.includes("nome do lead") || h.includes("nome do contato") || h === "nome" || (h.includes("name") && !h.includes("campaign") && !h.includes("produto") && !h.includes("product"))) return "name";
  if (h.includes("celular") || h.includes("telefone") || (h.includes("phone") && !h.includes("campaign"))) return "phone";
  if (h.includes("mail")) return "email";
  if (h.includes("campanha") || h.includes("campaign")) return "campaign";
  if (h.includes("etapa") || h.includes("stage") || h.includes("step") || h.includes("funil")) return "stage";
  if (h.includes("origem") || (h.includes("source") && !h.includes("utm"))) return "source";
  if (h.includes("respons") || h.includes("owner") || h.includes("vendedor")) return "owner";
  if (h.includes("empresa") || h.includes("company") || h.includes("razao") || h.includes("fantasia")) return "company";
  if (h.includes("produto") || h.includes("nome do produto")) return "product";
  if (h.includes("valor") || (h.includes("value") && !h.includes("utm"))) return "value";
  if (h.includes("etiqueta") || h.includes("tag")) return "tags";
  if (h.includes("cidade") || h.includes("city")) return "city";
  if (h.includes("estado") || (h.includes("state") && !h.includes("utm"))) return "state";
  if (h.includes("anota") || h.includes("descri") || h.includes("notes") || h.includes("observ") || h.includes("primeira anota")) return "notes";
  if (h.includes("utm_source") || h === "utm source") return "utm_source";
  if (h.includes("utm_campaign") || h === "utm campaign") return "utm_campaign";
  return "";
}

/* ── Template CSV ───────────────────────────────────────────── */
const TEMPLATE_HEADERS = [
  "Nome do Lead", "Celular do Contato 1", "E-mail do Contato 1",
  "Origem", "Campanha", "Etapa", "Responsavel 1",
  "Razao Social", "Nome do Produto 1", "Valor do Produto 1",
  "Etiqueta 1", "Cidade", "Estado", "Primeira Anotacao",
  "UTM Source", "UTM Campaign",
];
const TEMPLATE_SAMPLE = [
  ["Shynaida Linhares", "+5598981606187", "shynaida@email.com", "Indicacao de Aluno", "", "Follow Up D1", "Carlos Augusto", "", "Curso Regular - 1x/semana", "303.45", "quente", "Sao Luis", "MA", "Interessada no curso avancado", "", ""],
  ["Isabelle Costa", "+5584987723431", "", "Indicacao de Aluno", "", "Novo lead", "Carlos Augusto", "", "Curso Regular - 1x/semana", "357", "", "Natal", "RN", "", "", ""],
  ["Maria Silva", "+55 11 99999-0000", "maria@empresa.com", "WhatsApp", "Black Friday 2026", "Em contato", "SDR 1", "Empresa X", "Imersao Intensiva", "497", "vip;quente", "Sao Paulo", "SP", "Veio pelo anuncio do Instagram", "instagram", "imersao_2026"],
];

/* ── Parser CSV robusto (suporta , e ;) ─────────────────────── */
function parseCSV(text: string): string[][] {
  const cleaned = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQ) {
      if (ch === '"' && cleaned[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === "," || ch === ";") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/* ── Parser XLSX via SheetJS (carregado dinamicamente) ──────── */
async function parseXLSX(buffer: ArrayBuffer): Promise<string[][]> {
  const wb = XLSX.read(buffer, { type: "array", cellText: true, cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: string[][] = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: "" });
  return data.filter((r) => r.some((c) => String(c).trim()));
}

/* ── Componente principal ───────────────────────────────────── */
export function ImportLeads() {
  const router = useRouter();
  const { addContacts, addDeal, pipelines } = useStore();

  const [headers, setHeaders]   = useState<string[]>([]);
  const [rows, setRows]         = useState<string[][]>([]);
  const [mapping, setMapping]   = useState<Record<number, FieldKey | "">>({});
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  /* ── Download modelo ─────────────────────────────────────── */
  function downloadTemplate() {
    const bom = "﻿";
    const csv = [
      TEMPLATE_HEADERS.join(","),
      ...TEMPLATE_SAMPLE.map((r) => r.map((v) => v.includes(",") ? `"${v}"` : v).join(",")),
    ].join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "modelo-befluent-leads.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado! Preencha e importe aqui.");
  }

  /* ── Processa arquivo (CSV ou XLSX) ─────────────────────── */
  async function handleFile(file: File) {
    setLoading(true);
    setFileName(file.name);
    try {
      let parsed: string[][];
      const isXLSX = /\.(xlsx|xls|xlsm)$/i.test(file.name);

      if (isXLSX) {
        const buffer = await file.arrayBuffer();
        parsed = await parseXLSX(buffer);
        // Converte todos os valores para string
        parsed = parsed.map((r) => r.map((c) => String(c ?? "").trim()));
      } else {
        const text = await file.text();
        parsed = parseCSV(text);
      }

      if (parsed.length < 2) {
        toast.error("Arquivo vazio ou sem dados suficientes.");
        setLoading(false);
        return;
      }

      const hdr      = parsed[0].map((h) => String(h).trim());
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => String(c).trim()));

      setHeaders(hdr);
      setRows(dataRows);

      const m: Record<number, FieldKey | ""> = {};
      hdr.forEach((h, i) => { m[i] = guessMapping(h); });
      setMapping(m);

      const mappedAuto = Object.values(m).filter(Boolean).length;
      toast.success(`${dataRows.length} leads detectados — ${mappedAuto} colunas mapeadas automaticamente.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao ler o arquivo. Verifique se nao esta corrompido.");
    }
    setLoading(false);
  }

  /* ── Importar ────────────────────────────────────────────── */
  function doImport() {
    const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    if (nameCol === undefined) { toast.error("Mapeie a coluna de Nome do Lead."); return; }

    const colFor = (key: FieldKey) => {
      const e = Object.entries(mapping).find(([, v]) => v === key);
      return e ? Number(e[0]) : -1;
    };
    const cols = Object.fromEntries(SYSTEM_FIELDS.map((f) => [f.key, colFor(f.key)])) as Record<FieldKey, number>;
    const get  = (r: string[], key: FieldKey) => cols[key] >= 0 ? (String(r[cols[key]] ?? "")).trim() : "";

    const pipeline     = pipelines[0];
    const stages       = pipeline?.stages ?? [];
    const newLeadStage = stages.find((s) => s.name.toLowerCase().includes("novo") || s.name.toLowerCase().includes("new")) ?? stages[0];

    const items = rows.map((r) => {
      const name = get(r, "name");
      if (!name) return null;
      const stageRaw    = get(r, "stage");
      const matchStage  = stageRaw
        ? stages.find((s) => s.name.toLowerCase().includes(stageRaw.toLowerCase())) ?? newLeadStage
        : newLeadStage;
      return {
        contact: {
          name, email: get(r, "email"), phone: get(r, "phone"),
          company: get(r, "company"), source: get(r, "source") || "Importacao",
          score: 0, owner: get(r, "owner") || DEFAULT_OWNER,
          tags: [
            ...get(r, "tags").split(";").map((t) => t.trim()).filter(Boolean),
            ...(get(r, "campaign") ? [`camp:${get(r, "campaign")}`] : []),
          ],
        },
        deal: pipeline && matchStage ? {
          title: name, pipelineId: pipeline.id, stageId: matchStage.id, contact: name,
          owner: get(r, "owner") || DEFAULT_OWNER,
          value: parseFloat(get(r, "value").replace(",", ".")) || 0,
          tags:  get(r, "tags").split(";").map((t) => t.trim()).filter(Boolean),
          notes: [
            get(r, "notes"),
            get(r, "product")    ? `Produto: ${get(r, "product")}`          : "",
            get(r, "city")       ? `Local: ${get(r, "city")}/${get(r, "state")}` : "",
            get(r, "utm_source") ? `UTM: ${get(r, "utm_source")} / ${get(r, "utm_campaign")}` : "",
          ].filter(Boolean).join(" | "),
        } : null,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null && !!x.contact.name);

    if (items.length === 0) { toast.error("Nenhum lead valido encontrado."); return; }

    addContacts(items.map((i) => i.contact));
    if (pipeline) items.forEach((i) => { if (i.deal) addDeal(i.deal); });

    toast.success(`${items.length} leads importados para o funil "${pipeline?.name ?? "Funil de Vendas"}"!`);
    router.push("/pipeline");
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const hasName     = Object.values(mapping).includes("name");

  return (
    <div className="space-y-6">
      {/* Layout: 2 colunas principais apenas no mapping, senão 1 coluna */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* Coluna principal */}
        <div className="space-y-5 xl:col-span-2">

          {/* Step 1 — Modelo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" /> 1. Baixe o modelo
              </CardTitle>
              <CardDescription>
                Formato compativel com o seu CRM atual. Abra no Excel ou Google Sheets, cole seus leads e importe aqui.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="size-4" /> Baixar modelo (.csv)
              </Button>

              {/* Tabela de preview do modelo — scroll horizontal */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="bg-white/[0.04]">
                      {TEMPLATE_HEADERS.map((h) => (
                        <th key={h} className="whitespace-nowrap border-b border-border px-3 py-2 text-left font-semibold text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TEMPLATE_SAMPLE.slice(0, 2).map((r, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        {r.map((c, j) => (
                          <td key={j} className="whitespace-nowrap px-3 py-2 text-muted-foreground/70">
                            {c || <span className="text-muted-foreground/30">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 — Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5 text-primary" /> 2. Envie seu arquivo
              </CardTitle>
              <CardDescription>
                Aceita <strong>.xlsx</strong> (Excel) e <strong>.csv</strong> — exportados do seu CRM, Excel ou Google Sheets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 text-center transition-all",
                  dragOver ? "border-primary bg-primary/[0.06]" : "border-border hover:border-primary/40 hover:bg-white/[0.02]"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Processando {fileName}...</p>
                  </>
                ) : rows.length > 0 ? (
                  <>
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-green-500/10">
                      <CheckCircle2 className="size-7 text-green-400" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-green-400">{rows.length} leads carregados</p>
                      <p className="text-xs text-muted-foreground">{fileName} · clique para trocar o arquivo</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Upload className="size-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-semibold">Clique ou arraste o arquivo aqui</p>
                      <p className="mt-1 text-xs text-muted-foreground">Suporta <strong>.xlsx</strong> (Excel) e <strong>.csv</strong></p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px]">Excel .xlsx</Badge>
                      <Badge variant="outline" className="text-[10px]">CSV .csv</Badge>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </label>
            </CardContent>
          </Card>

          {/* Step 3 — Mapeamento */}
          {headers.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Table2 className="size-5 text-primary" /> 3. Confirme o mapeamento
                    </CardTitle>
                    <CardDescription>
                      {mappedCount} de {headers.length} colunas mapeadas automaticamente.
                      {!hasName && <span className="ml-1 font-medium text-destructive">Mapeie a coluna Nome (obrigatoria).</span>}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" onClick={() => setPreview((v) => !v)}>
                    <Eye className="size-3.5" /> {preview ? "Ocultar" : "Ver exemplo"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {headers.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                      mapping[i] ? "border-primary/25 bg-primary/[0.03]" : "border-border"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{h || `Coluna ${i + 1}`}</p>
                      {preview && rows[0]?.[i] && (
                        <p className="truncate text-[10px] text-muted-foreground">ex: {rows[0][i]}</p>
                      )}
                    </div>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <select
                      value={mapping[i] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as FieldKey | "" }))}
                      className={cn(
                        "h-9 w-48 shrink-0 rounded-md border bg-background px-2 text-sm outline-none",
                        mapping[i] ? "border-primary/40 text-foreground" : "border-input text-muted-foreground"
                      )}
                    >
                      <option value="">Ignorar</option>
                      {SYSTEM_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="pt-3">
                  <Button onClick={doImport} disabled={!hasName} className="w-full gap-2" size="lg">
                    <CheckCircle2 className="size-4" /> Importar {rows.length} leads para o funil
                  </Button>
                  {!hasName && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      Selecione "Nome do Lead" em alguma coluna para habilitar.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna lateral — sem sticky, sem sobreposição */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pre-visualizacao</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <FileSpreadsheet className="size-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">Envie um arquivo para ver os leads aqui.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{rows.length} leads</Badge>
                    <Badge variant={hasName ? "default" : "destructive"} className="text-[10px]">
                      {hasName ? "Pronto" : "Falta Nome"}
                    </Badge>
                  </div>
                  {rows.slice(0, 6).map((r, i) => {
                    const nC = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
                    const pC = Object.entries(mapping).find(([, v]) => v === "phone")?.[0];
                    const name  = nC !== undefined ? r[Number(nC)]  : r[0];
                    const phone = pC !== undefined ? r[Number(pC)] : "";
                    return (
                      <div key={i} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                        <p className="text-sm font-medium">{name || `Linha ${i + 1}`}</p>
                        {phone && <p className="text-[10px] text-muted-foreground">{phone}</p>}
                      </div>
                    );
                  })}
                  {rows.length > 6 && <p className="text-center text-xs text-muted-foreground">+ {rows.length - 6} leads...</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {pipelines[0] && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Destino no funil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold text-sm">{pipelines[0].name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {pipelines[0].stages.map((s) => (
                    <span key={s.id} className="rounded-full border border-border bg-secondary/30 px-2 py-0.5 text-[10px]">
                      {s.name}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Se "Etapa" for mapeada, o lead vai para a etapa correspondente. Caso contrario, vai para a primeira etapa.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
