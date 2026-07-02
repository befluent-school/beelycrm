"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload, ArrowRight, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, DEFAULT_OWNER } from "@/lib/store";

const SYSTEM_FIELDS = [
  { key: "name", label: "Nome", required: true },
  { key: "email", label: "E-mail", required: false },
  { key: "phone", label: "Telefone", required: false },
  { key: "company", label: "Empresa", required: false },
  { key: "source", label: "Origem", required: false },
  { key: "tags", label: "Tags (separadas por ;)", required: false },
] as const;

type FieldKey = (typeof SYSTEM_FIELDS)[number]["key"];

const TEMPLATE_HEADERS = ["nome", "email", "telefone", "empresa", "origem", "tags"];
const TEMPLATE_SAMPLE = [
  ["Maria Silva", "maria@empresa.com", "+55 11 99999-0000", "Empresa X", "WhatsApp", "quente;vip"],
  ["João Souza", "joao@empresa.com", "+55 21 98888-1111", "Empresa Y", "Site", "frio"],
];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === "," || ch === ";") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function guessMapping(header: string): FieldKey | "" {
  const h = header.toLowerCase();
  if (h.includes("nome") || h.includes("name")) return "name";
  if (h.includes("mail")) return "email";
  if (h.includes("tel") || h.includes("phone") || h.includes("celular") || h.includes("whats")) return "phone";
  if (h.includes("empresa") || h.includes("company")) return "company";
  if (h.includes("origem") || h.includes("source") || h.includes("fonte")) return "source";
  if (h.includes("tag")) return "tags";
  return "";
}

export function ImportLeads() {
  const router = useRouter();
  const addContacts = useStore((s) => s.addContacts);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey | "">>({});

  function downloadTemplate() {
    const csv = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_SAMPLE.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-importacao-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado! Preencha e faça o upload.");
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result));
      if (parsed.length < 2) { toast.error("Arquivo vazio ou sem dados."); return; }
      const hdr = parsed[0].map((h) => h.trim());
      setHeaders(hdr);
      setRows(parsed.slice(1));
      const m: Record<number, FieldKey | ""> = {};
      hdr.forEach((h, i) => { m[i] = guessMapping(h); });
      setMapping(m);
      toast.success(`${parsed.length - 1} linhas detectadas. Confira o mapeamento.`);
    };
    reader.readAsText(file);
  }

  function doImport() {
    const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    if (nameCol === undefined) { toast.error("Mapeie a coluna de Nome (obrigatória)."); return; }
    const colFor = (key: FieldKey) => {
      const e = Object.entries(mapping).find(([, v]) => v === key);
      return e ? Number(e[0]) : -1;
    };
    const cols = {
      name: colFor("name"), email: colFor("email"), phone: colFor("phone"),
      company: colFor("company"), source: colFor("source"), tags: colFor("tags"),
    };
    const contacts = rows
      .map((r) => ({
        name: (r[cols.name] ?? "").trim(),
        email: cols.email >= 0 ? (r[cols.email] ?? "").trim() : "",
        phone: cols.phone >= 0 ? (r[cols.phone] ?? "").trim() : "",
        company: cols.company >= 0 ? (r[cols.company] ?? "").trim() : "",
        source: cols.source >= 0 ? (r[cols.source] ?? "").trim() || "Importação" : "Importação",
        tags: cols.tags >= 0 ? (r[cols.tags] ?? "").split(";").map((t) => t.trim()).filter(Boolean) : [],
        score: 0,
        owner: DEFAULT_OWNER,
      }))
      .filter((c) => c.name);
    if (contacts.length === 0) { toast.error("Nenhum contato válido para importar."); return; }
    addContacts(contacts);
    toast.success(`${contacts.length} leads importados com sucesso! 🎉`);
    router.push("/contatos");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /> 1. Baixe o modelo</CardTitle>
            <CardDescription>Use nossa planilha modelo para garantir que os campos cheguem no padrão do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadTemplate} variant="outline"><Download className="size-4" /> Baixar modelo (.csv)</Button>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead><tr className="bg-white/[0.03] text-left text-muted-foreground">{TEMPLATE_HEADERS.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>{TEMPLATE_SAMPLE.map((r, i) => <tr key={i} className="border-t border-border/70">{r.map((c, j) => <td key={j} className="px-3 py-2 text-muted-foreground">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="size-5 text-primary" /> 2. Envie seu arquivo</CardTitle>
            <CardDescription>Aceita CSV exportado de planilhas (Excel, Google Sheets) ou de outros CRMs.</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center transition-colors hover:border-primary/50 hover:bg-white/[0.02]">
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">Clique para selecionar o arquivo CSV</span>
              <span className="text-xs text-muted-foreground">ou arraste e solte aqui</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </CardContent>
        </Card>

        {/* Step 3: mapping */}
        {headers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowRight className="size-5 text-primary" /> 3. Mapeie as colunas</CardTitle>
              <CardDescription>Relacione cada coluna do seu arquivo a um campo do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="flex-1 truncate text-sm font-medium">{h || `Coluna ${i + 1}`}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <select
                    value={mapping[i] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as FieldKey | "" }))}
                    className="h-9 w-44 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <option value="">Ignorar coluna</option>
                    {SYSTEM_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>)}
                  </select>
                </div>
              ))}
              <Button onClick={doImport} className="mt-2 w-full"><CheckCircle2 className="size-4" /> Importar {rows.length} leads</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Side preview */}
      <div>
        <Card className="sticky top-24">
          <CardHeader><CardTitle>Pré-visualização</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Envie um arquivo para ver as primeiras linhas aqui.</p>
            ) : (
              <div className="space-y-2">
                <Badge variant="secondary">{rows.length} linhas</Badge>
                {rows.slice(0, 4).map((r, i) => (
                  <div key={i} className="truncate rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">{r.join(" · ")}</div>
                ))}
                {rows.length > 4 && <p className="text-xs text-muted-foreground">+ {rows.length - 4} linhas...</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
