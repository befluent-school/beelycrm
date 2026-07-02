"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download, Upload, ArrowRight, CheckCircle2,
  FileSpreadsheet, Eye, Loader2, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, DEFAULT_OWNER } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ── Campos do sistema ──────────────────────────────────────── */
const SYSTEM_FIELDS = [
  { key: "name",       label: "Nome do Lead",            required: true  },
  { key: "phone",      label: "Telefone / Celular",       required: false },
  { key: "email",      label: "E-mail",                   required: false },
  { key: "source",     label: "Origem",                   required: false },
  { key: "campaign",   label: "Campanha",                 required: false },
  { key: "stage",      label: "Etapa do Funil",           required: false },
  { key: "owner",      label: "Responsavel",              required: false },
  { key: "company",    label: "Empresa / Razao Social",   required: false },
  { key: "product",    label: "Produto de Interesse",     required: false },
  { key: "value",      label: "Valor (R$)",               required: false },
  { key: "tags",       label: "Etiquetas (separadas ;)",  required: false },
  { key: "city",       label: "Cidade",                   required: false },
  { key: "state",      label: "Estado",                   required: false },
  { key: "notes",      label: "Anotacoes / Descricao",    required: false },
  { key: "utm_source", label: "UTM Source",               required: false },
  { key: "utm_campaign",label:"UTM Campaign",             required: false },
] as const;

type FieldKey = (typeof SYSTEM_FIELDS)[number]["key"];

/* ── Mapeamento automático de headers ───────────────────────── */
function guessMapping(header: string): FieldKey | "" {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (h.includes("nome do lead") || h.includes("nome do contato") || h === "nome" || h.includes("name")) return "name";
  if (h.includes("celular") || h.includes("telefone") || h.includes("phone") || h.includes("whats")) return "phone";
  if (h.includes("mail")) return "email";
  if (h.includes("campanha") || h.includes("campaign")) return "campaign";
  if (h.includes("etapa") || h.includes("stage") || h.includes("step") || h.includes("funil")) return "stage";
  if (h.includes("origem") || h.includes("source") || h.includes("fonte")) return "source";
  if (h.includes("respons") || h.includes("owner") || h.includes("vendedor") || h.includes("sdr")) return "owner";
  if (h.includes("empresa") || h.includes("company") || h.includes("razao") || h.includes("fantasia")) return "company";
  if (h.includes("produto") || h.includes("product") || h.includes("nome do produto")) return "product";
  if (h.includes("valor") || h.includes("value") || h.includes("preco") || h.includes("price")) return "value";
  if (h.includes("etiqueta") || h.includes("tag")) return "tags";
  if (h.includes("cidade") || h.includes("city")) return "city";
  if (h.includes("estado") || h.includes("state")) return "state";
  if (h.includes("anota") || h.includes("descri") || h.includes("notes") || h.includes("observ")) return "notes";
  if (h.includes("utm_source") || h.includes("utm source")) return "utm_source";
  if (h.includes("utm_campaign") || h.includes("utm campaign")) return "utm_campaign";
  return "";
}

/* ── Template CSV — compatível com o xlsx da Be Fluent ────────── */
const TEMPLATE_HEADERS = [
  "Nome do Lead", "Celular do Contato 1", "E-mail do Contato 1",
  "Origem", "Campanha", "Etapa", "Responsavel 1",
  "Razao Social", "Nome do Produto 1", "Valor do Produto 1",
  "Etiqueta 1", "Cidade", "Estado", "Primeira Anotacao",
  "UTM Source", "UTM Campaign",
];
const TEMPLATE_SAMPLE = [
  [
    "Shynaida Linhares", "+5598981606187", "shynaida@email.com",
    "Indicacao de Aluno", "", "Follow Up D1", "Carlos Augusto",
    "", "Curso Regular - 1x/semana", "303.45",
    "quente", "Sao Luis", "MA", "Interessada no curso avancado",
    "", "",
  ],
  [
    "Isabelle Costa", "+5584987723431", "",
    "Indicacao de Aluno", "", "Novo lead", "Carlos Augusto",
    "", "Curso Regular - 1x/semana", "357",
    "", "Natal", "RN", "",
    "", "",
  ],
  [
    "Maria Silva", "+55 11 99999-0000", "maria@empresa.com",
    "WhatsApp", "Black Friday 2026", "Em contato", "SDR 1",
    "Empresa X", "Imersao Intensiva", "497",
    "vip;quente", "Sao Paulo", "SP", "Veio pelo anuncio do Instagram",
    "instagram", "imersao_2026",
  ],
];

/* ── Parser CSV robusto ─────────────────────────────────────── */
function parseCSV(text: string): string[][] {
  // Normaliza quebras de linha e BOM
  const cleaned = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
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

/* ── Main component ─────────────────────────────────────────── */
export function ImportLeads() {
  const router = useRouter();
  const { addContacts, addDeal, pipelines } = useStore();

  const [headers, setHeaders]   = useState<string[]>([]);
  const [rows, setRows]         = useState<string[][]>([]);
  const [mapping, setMapping]   = useState<Record<number, FieldKey | "">>({});
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* ── Download do modelo CSV ─────────────────────────────── */
  function downloadTemplate() {
    const bom  = "﻿"; // UTF-8 BOM para Excel abrir corretamente
    const csv  = [
      TEMPLATE_HEADERS.join(","),
      ...TEMPLATE_SAMPLE.map((r) =>
        r.map((v) => (v.includes(",") || v.includes(";") ? `"${v}"` : v)).join(",")
      ),
    ].join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "modelo-befly-crm-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado! Abra no Excel ou Google Sheets, preencha e importe.");
  }

  /* ── Processa arquivo ─────────────────────────────────────── */
  async function handleFile(file: File) {
    setLoading(true);
    try {
      let parsed: string[][];

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Lê XLSX via API interna (simplificado: converte no servidor)
        // Como estamos no browser, usamos FileReader + SheetJS (se disponível)
        // Fallback: avisa o usuário para exportar como CSV
        toast.error(
          "Arquivos Excel (.xlsx) precisam ser exportados como CSV primeiro. " +
          "No Excel: Arquivo > Salvar como > CSV UTF-8. " +
          "No Google Sheets: Arquivo > Fazer download > CSV."
        );
        setLoading(false);
        return;
      }

      const text = await file.text();
      parsed     = parseCSV(text);

      if (parsed.length < 2) {
        toast.error("Arquivo vazio ou sem dados. Verifique se tem pelo menos 1 linha de cabecalho e 1 de dados.");
        setLoading(false);
        return;
      }

      const hdr = parsed[0].map((h) => h.trim());
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => c.trim()));

      setHeaders(hdr);
      setRows(dataRows);

      const m: Record<number, FieldKey | ""> = {};
      hdr.forEach((h, i) => { m[i] = guessMapping(h); });
      setMapping(m);

      toast.success(`${dataRows.length} leads detectados — confirme o mapeamento abaixo.`);
    } catch {
      toast.error("Erro ao ler o arquivo. Tente exportar como CSV UTF-8.");
    }
    setLoading(false);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  /* ── Importar leads ──────────────────────────────────────── */
  function doImport() {
    const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    if (nameCol === undefined) {
      toast.error("Mapeie pelo menos a coluna de Nome do Lead.");
      return;
    }

    const colFor = (key: FieldKey) => {
      const e = Object.entries(mapping).find(([, v]) => v === key);
      return e ? Number(e[0]) : -1;
    };
    const cols = Object.fromEntries(
      SYSTEM_FIELDS.map((f) => [f.key, colFor(f.key)])
    ) as Record<FieldKey, number>;

    const get = (r: string[], key: FieldKey) =>
      cols[key] >= 0 ? (r[cols[key]] ?? "").trim() : "";

    // Pega o primeiro funil e as etapas
    const pipeline  = pipelines[0];
    const stages    = pipeline?.stages ?? [];
    const newLeadStage = stages.find((s) =>
      s.name.toLowerCase().includes("novo") || s.name.toLowerCase().includes("new")
    ) ?? stages[0];

    const contacts = rows
      .map((r) => {
        const name = get(r, "name");
        if (!name) return null;

        const stageNameRaw = get(r, "stage");
        const matchedStage = stages.find((s) =>
          s.name.toLowerCase().includes(stageNameRaw.toLowerCase())
        ) ?? newLeadStage;

        return {
          contact: {
            name,
            email:   get(r, "email"),
            phone:   get(r, "phone"),
            company: get(r, "company"),
            source:  get(r, "source") || "Importacao",
            score:   0,
            owner:   get(r, "owner") || DEFAULT_OWNER,
            tags: [
              ...get(r, "tags").split(";").map((t) => t.trim()).filter(Boolean),
              ...(get(r, "campaign") ? [`camp:${get(r, "campaign")}`] : []),
            ],
          },
          deal: pipeline ? {
            title:      name,
            value:      parseFloat(get(r, "value").replace(",", ".")) || 0,
            pipelineId: pipeline.id,
            stageId:    matchedStage?.id ?? "",
            contact:    name,
            owner:      get(r, "owner") || DEFAULT_OWNER,
            tags:       get(r, "tags").split(";").map((t) => t.trim()).filter(Boolean),
            notes: [
              get(r, "notes"),
              get(r, "product") ? `Produto: ${get(r, "product")}` : "",
              get(r, "city")    ? `Local: ${get(r, "city")}/${get(r, "state")}` : "",
              get(r, "utm_source") ? `UTM: ${get(r, "utm_source")} / ${get(r, "utm_campaign")}` : "",
            ].filter(Boolean).join(" | "),
          } : null,
          stageId: matchedStage?.id ?? "",
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && !!x.contact.name);

    if (contacts.length === 0) {
      toast.error("Nenhum lead valido encontrado. Verifique se a coluna Nome esta mapeada corretamente.");
      return;
    }

    // Adiciona contatos
    addContacts(contacts.map((c) => c.contact));

    // Cria deal no funil para cada lead
    if (pipeline) {
      contacts.forEach((c) => {
        if (c.deal && c.deal.stageId) {
          addDeal(c.deal);
        }
      });
    }

    toast.success(
      `${contacts.length} leads importados e adicionados ao funil "${pipeline?.name ?? "Funil de Vendas"}"!`
    );
    router.push("/pipeline");
  }

  /* ── Mapeamentos com cor ──────────────────────────────────── */
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const hasName = Object.values(mapping).includes("name");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">

        {/* Step 1 — Download do modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" /> 1. Baixe o modelo compativel
            </CardTitle>
            <CardDescription>
              Modelo ja formatado no padrao da Be Fluent — mesmos campos do seu CRM atual.
              Abra no Excel ou Google Sheets, cole seus leads e importe aqui.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={downloadTemplate} variant="outline" className="gap-2">
              <Download className="size-4" /> Baixar modelo (.csv)
            </Button>

            {/* Preview da tabela */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-[11px]">
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

            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <p className="text-[11px] text-muted-foreground">
                <strong className="text-foreground">Tem um arquivo .xlsx?</strong> Exporte como CSV:
                no Excel clique em Arquivo &gt; Salvar como &gt; <em>CSV UTF-8 (delimitado por virgula)</em>.
                No Google Sheets: Arquivo &gt; Fazer download &gt; <em>Valores separados por virgula (.csv)</em>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 — Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" /> 2. Envie seu arquivo CSV
            </CardTitle>
            <CardDescription>
              Compativel com exportacoes do seu CRM atual, Excel ou Google Sheets (formato CSV).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 text-center transition-all",
                dragOver
                  ? "border-primary bg-primary/[0.05]"
                  : "border-border hover:border-primary/40 hover:bg-white/[0.02]"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
            >
              {loading ? (
                <Loader2 className="size-8 animate-spin text-primary" />
              ) : (
                <>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload className="size-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold">
                      {rows.length > 0 ? `${rows.length} leads carregados — envie outro para substituir` : "Clique ou arraste o arquivo aqui"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">CSV exportado do Excel, Google Sheets ou do seu CRM</p>
                  </div>
                  {rows.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="mr-1 size-3 text-green-400" /> {rows.length} linhas detectadas
                    </Badge>
                  )}
                </>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onInputChange}
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
                    <ArrowRight className="size-5 text-primary" /> 3. Mapeie as colunas
                  </CardTitle>
                  <CardDescription>
                    {mappedCount} de {headers.length} colunas mapeadas.
                    {!hasName && <span className="ml-1 text-destructive font-medium">Mapeie a coluna de Nome (obrigatoria).</span>}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setPreview((v) => !v)}
                >
                  <Eye className="size-3.5" /> {preview ? "Ocultar" : "Pre-visualizar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {headers.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                    mapping[i] ? "border-primary/20 bg-primary/[0.03]" : "border-border"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h || `Coluna ${i + 1}`}</p>
                    {preview && rows[0]?.[i] && (
                      <p className="truncate text-[10px] text-muted-foreground">ex: {rows[0][i]}</p>
                    )}
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  <select
                    value={mapping[i] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as FieldKey | "" }))}
                    className={cn(
                      "h-9 w-52 shrink-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      mapping[i] ? "border-primary/40 text-foreground" : "border-input text-muted-foreground"
                    )}
                  >
                    <option value="">Ignorar coluna</option>
                    {SYSTEM_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="pt-3">
                <Button
                  onClick={doImport}
                  disabled={!hasName}
                  className="w-full gap-2"
                  size="lg"
                >
                  <CheckCircle2 className="size-4" />
                  Importar {rows.length} leads para o funil
                </Button>
                {!hasName && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Mapeie a coluna "Nome do Lead" para habilitar a importacao.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Painel lateral */}
      <div className="space-y-4">
        {/* Preview */}
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-base">Pre-visualizacao</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <FileSpreadsheet className="size-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Envie um arquivo para ver as primeiras linhas aqui.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{rows.length} leads</Badge>
                  <Badge variant={hasName ? "default" : "destructive"} className="text-[10px]">
                    {hasName ? "Pronto para importar" : "Falta mapear Nome"}
                  </Badge>
                </div>
                {rows.slice(0, 5).map((r, i) => {
                  const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
                  const phoneCol = Object.entries(mapping).find(([, v]) => v === "phone")?.[0];
                  const name  = nameCol  !== undefined ? r[Number(nameCol)]  : r[0];
                  const phone = phoneCol !== undefined ? r[Number(phoneCol)] : "";
                  return (
                    <div key={i} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                      <p className="text-sm font-medium">{name || `Linha ${i + 1}`}</p>
                      {phone && <p className="text-[10px] text-muted-foreground">{phone}</p>}
                    </div>
                  );
                })}
                {rows.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground">
                    + {rows.length - 5} leads...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info sobre o funil */}
        {pipelines[0] && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Destino no funil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Cada lead sera criado em:
              </p>
              <p className="font-semibold text-sm">{pipelines[0].name}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pipelines[0].stages.map((s) => (
                  <span key={s.id} className="rounded-full border border-border bg-secondary/30 px-2 py-0.5 text-[10px]">
                    {s.name}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Se a coluna "Etapa" for mapeada, o lead ira para a etapa correspondente.
                Caso contrario, ira para a primeira etapa do funil.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
