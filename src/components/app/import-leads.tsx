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
import { useStore, DEFAULT_OWNER, type Contact } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ── Campos mapeáveis do sistema ────────────────────────────────── */
const SYSTEM_FIELDS = [
  // Identificação
  { key: "name",               label: "Nome do Lead *",              required: true  },
  { key: "phone",              label: "Telefone / Celular",          required: false },
  { key: "email",              label: "E-mail",                      required: false },
  { key: "source",             label: "Origem",                      required: false },
  { key: "campaign",           label: "Campanha",                    required: false },
  { key: "stage",              label: "Etapa do Funil",              required: false },
  { key: "owner",              label: "Responsável",                 required: false },
  { key: "status",             label: "Status (Frio/Morno/Quente)",  required: false },
  { key: "tags",               label: "Etiquetas (separadas ;)",     required: false },
  { key: "firstNote",          label: "Primeira Anotação",           required: false },
  // Empresa / Produto
  { key: "company",            label: "Razão Social",                required: false },
  { key: "fantasyName",        label: "Nome Fantasia",               required: false },
  { key: "product",            label: "Nome do Produto",             required: false },
  { key: "productValue",       label: "Valor do Produto",            required: false },
  { key: "productDesc",        label: "Descrição do Produto",        required: false },
  // Endereco pessoal
  { key: "cep",                label: "CEP",                         required: false },
  { key: "country",            label: "País",                        required: false },
  { key: "state",              label: "Estado",                      required: false },
  { key: "city",               label: "Cidade",                      required: false },
  { key: "neighborhood",       label: "Bairro",                      required: false },
  { key: "street",             label: "Logradouro",                  required: false },
  { key: "complement",         label: "Complemento",                 required: false },
  { key: "number",             label: "Número",                      required: false },
  { key: "cpfCnpj",            label: "CPF / CNPJ",                  required: false },
  // Endereco empresa
  { key: "companyCep",         label: "CEP (Empresa)",               required: false },
  { key: "companyCountry",     label: "País (Empresa)",              required: false },
  { key: "companyState",       label: "Estado (Empresa)",            required: false },
  { key: "companyCity",        label: "Cidade (Empresa)",            required: false },
  { key: "companyNeighborhood",label: "Bairro (Empresa)",            required: false },
  { key: "companyStreet",      label: "Logradouro (Empresa)",        required: false },
  { key: "companyComplement",  label: "Complemento (Empresa)",       required: false },
  { key: "companyNumber",      label: "Número (Empresa)",            required: false },
  // Meta Ads
  { key: "metaAdId",           label: "Meta Ad Id",                  required: false },
  { key: "metaAdName",         label: "Meta Ad Name",                required: false },
  { key: "metaAdsetId",        label: "Meta Adset Id",               required: false },
  { key: "metaAdsetName",      label: "Meta Adset Name",             required: false },
  { key: "metaCampaignId",     label: "Meta Campaign Id",            required: false },
  { key: "metaCampaignName",   label: "Meta Campaign Name",          required: false },
  { key: "metaFormId",         label: "Meta Form Id",                required: false },
  { key: "metaFormName",       label: "Meta Form Name",              required: false },
  { key: "metaPageId",         label: "Meta Page Id",                required: false },
  { key: "metaPageName",       label: "Meta Page Name",              required: false },
  { key: "metaLeadgenId",      label: "Meta Leadgen Id",             required: false },
  { key: "metaPlatform",       label: "Meta Platform",               required: false },
  // UTM
  { key: "utmUrl",             label: "UTM URL",                     required: false },
  { key: "utmMedium",          label: "UTM Medium",                  required: false },
  { key: "utmSource",          label: "UTM Source",                  required: false },
  { key: "utmCampaign",        label: "UTM Campaign",                required: false },
  { key: "utmTerm",            label: "UTM Term",                    required: false },
  { key: "utmContent",         label: "UTM Content",                 required: false },
  // Qualificacao
  { key: "urgency",            label: "Principal Urgência",          required: false },
  { key: "investmentIntent",   label: "Investimento Pretendido",     required: false },
  { key: "jobTitle",           label: "Cargo",                       required: false },
  { key: "monthlyBudget",      label: "Opção de Investimento Mensal",required: false },
  { key: "contactPreference",  label: "Preferência de Contato",      required: false },
  { key: "mainChallenge",      label: "Maior Desafio com Inglês",    required: false },
  { key: "sector",             label: "Setor Corporativo",           required: false },
  { key: "classFrequency",     label: "Frequência de Aulas",         required: false },
  { key: "professionalMoment", label: "Momento Profissional",        required: false },
  // Misc
  { key: "externalId",         label: "ID Externo (CRM antigo)",     required: false },
  { key: "registeredAt",       label: "Data de Cadastro",            required: false },
  { key: "funnel",             label: "Funil de Origem",             required: false },
  { key: "team",               label: "Equipe",                      required: false },
] as const;

type FieldKey = (typeof SYSTEM_FIELDS)[number]["key"];

/* ── Mapeamento automático (68 colunas da planilha Be Fluent) ──── */
function guessMapping(header: string): FieldKey | "" {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  // Identificacao
  if (h === "nome do lead" || h === "nome do contato 1" || (h === "nome" && !h.includes("produto") && !h.includes("campanha") && !h.includes("fantasy") && !h.includes("fantasia"))) return "name";
  if (h.includes("celular") || (h === "telefone" && !h.includes("empresa"))) return "phone";
  if (h.includes("e-mail") || h.includes("email")) return "email";
  if (h === "origem") return "source";
  if (h === "campanha") return "campaign";
  if (h === "etapa") return "stage";
  if (h.startsWith("responsavel") || h === "responsavel 1") return "owner";
  if (h === "status") return "status";
  if (h.startsWith("etiqueta")) return "tags";
  if (h === "primeira anotacao") return "firstNote";
  // Empresa
  if (h === "razao social") return "company";
  if (h === "nome fantasia") return "fantasyName";
  if (h.startsWith("nome do produto")) return "product";
  if (h.startsWith("valor do produto")) return "productValue";
  if (h.startsWith("descricao do produto")) return "productDesc";
  // Endereco pessoal
  if (h === "cep") return "cep";
  if (h === "pais") return "country";
  if (h === "estado") return "state";
  if (h === "cidade") return "city";
  if (h === "bairro") return "neighborhood";
  if (h === "logradouro") return "street";
  if (h === "complemento") return "complement";
  if (h === "numero" && !h.includes("empresa")) return "number";
  if (h === "cpf/cnpj" || h === "cpf" || h === "cnpj") return "cpfCnpj";
  // Endereco empresa
  if (h === "cep (empresa)") return "companyCep";
  if (h === "pais (empresa)") return "companyCountry";
  if (h === "estado (empresa)") return "companyState";
  if (h === "cidade (empresa)") return "companyCity";
  if (h === "bairro (empresa)") return "companyNeighborhood";
  if (h === "logradouro (empresa)") return "companyStreet";
  if (h === "complemento (empresa)") return "companyComplement";
  if (h === "numero (empresa)") return "companyNumber";
  // Meta Ads
  if (h === "meta ads ad id") return "metaAdId";
  if (h === "meta ads ad name") return "metaAdName";
  if (h === "meta ads adset id") return "metaAdsetId";
  if (h === "meta ads adset name") return "metaAdsetName";
  if (h === "meta ads campaign id") return "metaCampaignId";
  if (h === "meta ads campaign name") return "metaCampaignName";
  if (h === "meta ads form id") return "metaFormId";
  if (h === "meta ads form name") return "metaFormName";
  if (h === "meta ads page id") return "metaPageId";
  if (h === "meta ads page name") return "metaPageName";
  if (h === "meta ads leadgen id") return "metaLeadgenId";
  if (h === "meta ads platform") return "metaPlatform";
  // UTM
  if (h === "utm url") return "utmUrl";
  if (h === "utm medium") return "utmMedium";
  if (h === "utm source") return "utmSource";
  if (h === "utm campaign") return "utmCampaign";
  if (h === "utm term") return "utmTerm";
  if (h === "utm content") return "utmContent";
  // Qualificacao
  if (h === "principal urgencia") return "urgency";
  if (h.includes("pretende investir")) return "investmentIntent";
  if (h === "cargo") return "jobTitle";
  if (h.includes("opcao de investimento") || h.includes("investimento mensal")) return "monthlyBudget";
  if (h.includes("prefere iniciar") || h.includes("preferencia de contato")) return "contactPreference";
  if (h.includes("desafio") || h.includes("urgencia com o ingles")) return "mainChallenge";
  if (h.includes("setor corporativo") || h.includes("setor")) return "sector";
  if (h.includes("frequencia de aulas") || h.includes("frequencia")) return "classFrequency";
  if (h.includes("momento profissional")) return "professionalMoment";
  // Misc
  if (h === "id do lead") return "externalId";
  if (h === "data de cadastro") return "registeredAt";
  if (h === "funil") return "funnel";
  if (h === "equipe") return "team";
  return "";
}

/* ── Parser CSV (vírgula ou ponto-e-vírgula, BOM, CRLF) ────────── */
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

/* ── Modelo CSV para download ───────────────────────────────────── */
const TEMPLATE_HEADERS = [
  "ID do Lead","Nome do Lead","Nome do Contato 1","Celular do Contato 1","E-mail do Contato 1",
  "Origem","Campanha","Funil","Etapa","Status","Equipe","Responsável 1","Etiqueta 1",
  "Primeira Anotação","CEP","Estado","Cidade","Bairro","Logradouro","Complemento","Número","CPF/CNPJ",
  "Razão Social","Nome Fantasia",
  "Nome do Produto 1","Valor do Produto 1","Descrição do Produto 1",
  "Meta Ads Ad Id","Meta Ads Ad Name","Meta Ads Adset Id","Meta Ads Adset Name",
  "Meta Ads Campaign Id","Meta Ads Campaign Name","Meta Ads Form Id","Meta Ads Form Name",
  "Meta Ads Page Id","Meta Ads Page Name","Meta Ads Leadgen Id","Meta Ads Platform",
  "UTM URL","UTM Medium","UTM Source","UTM Campaign","UTM Term","UTM Content",
  "Principal urgência","Quanto você pretende investir no seu desenvolvimento em inglês?","Cargo",
  "Qual dessas opções de investimento mensal se encaixa melhor no seu planejamento?",
  "Como você prefere iniciar o seu contato com a gente?",
  "Pensando na sua rotina atual qual é o seu maior desafio ou urgência com o inglês no trabalho hoje?",
  "O nosso material muda de acordo com o seu setor corporativo. Qual opção melhor define você hoje?",
  "Para enviarmos a tabela certa no seu WhatsApp qual frequência de aulas você tem mais curiosidade em conhecer?",
  "Qual das opções abaixo melhor descreve o seu momento profissional atual?",
];
const TEMPLATE_SAMPLE = [
  ["6a18e22712708674","Thamires Esposito","Thamires Esposito","+5512981166320","",
   "Instagram","INSPIRE | TESTE CRIATIVOS","Comercial","Proposta Enviada","Frio","FUNDADOR","Carlos Augusto","Forms Ads",
   "","","SP","Sao Jose dos Campos","","","","","",
   "","",
   "Curso Regular - 1x/semana","303.45","",
   "","","","Referencia 2","","INSPIRE | TESTE CRIATIVOS","","INSPIRE | 1","","Be Fluent School","","ig",
   "","","","","","",
   "quero receber informações no whatsapp","","executivo clt","plano bronze r$ 357/mes","","","","",""],
];

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

  function downloadTemplate() {
    const bom = "﻿";
    const csv = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_SAMPLE.map((r) => r.map((v) => v.includes(",") ? `"${v}"` : v).join(","))].join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "modelo-befluent-leads.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado!");
  }

  async function handleFile(file: File) {
    setLoading(true);
    setFileName(file.name);
    try {
      let parsed: string[][];
      const isXLSX = /\.(xlsx|xls|xlsm)$/i.test(file.name);

      if (isXLSX) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array", cellText: true, cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        parsed = raw.map((r) => r.map((c) => String(c ?? "").trim()));
      } else {
        const text = await file.text();
        parsed = parseCSV(text);
      }

      if (parsed.length < 2) { toast.error("Arquivo vazio ou sem dados."); setLoading(false); return; }

      const hdr = parsed[0].map((h) => String(h).trim());
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => String(c).trim()));

      setHeaders(hdr);
      setRows(dataRows);

      const m: Record<number, FieldKey | ""> = {};
      hdr.forEach((h, i) => { m[i] = guessMapping(h); });
      setMapping(m);

      const mappedAuto = Object.values(m).filter(Boolean).length;
      toast.success(`${dataRows.length} leads detectados — ${mappedAuto}/${hdr.length} colunas mapeadas.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao ler o arquivo.");
    }
    setLoading(false);
  }

  function doImport() {
    const nameColEntry = Object.entries(mapping).find(([, v]) => v === "name");
    if (!nameColEntry) { toast.error("Mapeie a coluna Nome do Lead."); return; }

    const colFor = (key: FieldKey): number => {
      const e = Object.entries(mapping).find(([, v]) => v === key);
      return e ? Number(e[0]) : -1;
    };
    const get = (r: string[], key: FieldKey) => {
      const idx = colFor(key);
      return idx >= 0 ? String(r[idx] ?? "").trim() : "";
    };

    const pipeline     = pipelines[0];
    const stages       = pipeline?.stages ?? [];
    const newLeadStage = stages.find((s) => s.name.toLowerCase().includes("novo") || s.name.toLowerCase().includes("new")) ?? stages[0];

    let imported = 0;
    let skipped  = 0;

    const contactsToAdd: Omit<Contact, "id">[] = [];
    const dealsToAdd: Parameters<typeof addDeal>[0][] = [];

    for (const r of rows) {
      const name = get(r, "name");
      if (!name) { skipped++; continue; }

      const stageRaw    = get(r, "stage");
      const matchStage  = stageRaw
        ? (stages.find((s) => s.name.toLowerCase().includes(stageRaw.toLowerCase())) ?? newLeadStage)
        : newLeadStage;

      const tagsRaw  = get(r, "tags");
      const campaign = get(r, "campaign");
      const tags     = [
        ...tagsRaw.split(";").map((t) => t.trim()).filter(Boolean),
        ...(campaign ? [`camp:${campaign}`] : []),
      ];

      contactsToAdd.push({
        name,
        phone:               get(r, "phone"),
        email:               get(r, "email"),
        source:              get(r, "source") || "Importacao",
        campaign:            campaign,
        funnel:              get(r, "funnel"),
        stage:               stageRaw,
        status:              get(r, "status"),
        team:                get(r, "team"),
        owner:               get(r, "owner") || DEFAULT_OWNER,
        score:               0,
        tags,
        firstNote:           get(r, "firstNote"),
        company:             get(r, "company"),
        fantasyName:         get(r, "fantasyName"),
        cpfCnpj:             get(r, "cpfCnpj"),
        cep:                 get(r, "cep"),
        country:             get(r, "country"),
        state:               get(r, "state"),
        city:                get(r, "city"),
        neighborhood:        get(r, "neighborhood"),
        street:              get(r, "street"),
        complement:          get(r, "complement"),
        number:              get(r, "number"),
        companyCep:          get(r, "companyCep"),
        companyCountry:      get(r, "companyCountry"),
        companyState:        get(r, "companyState"),
        companyCity:         get(r, "companyCity"),
        companyNeighborhood: get(r, "companyNeighborhood"),
        companyStreet:       get(r, "companyStreet"),
        companyComplement:   get(r, "companyComplement"),
        companyNumber:       get(r, "companyNumber"),
        product:             get(r, "product"),
        productValue:        parseFloat(get(r, "productValue").replace(",", ".")) || undefined,
        productDesc:         get(r, "productDesc"),
        metaAdId:            get(r, "metaAdId"),
        metaAdName:          get(r, "metaAdName"),
        metaAdsetId:         get(r, "metaAdsetId"),
        metaAdsetName:       get(r, "metaAdsetName"),
        metaCampaignId:      get(r, "metaCampaignId"),
        metaCampaignName:    get(r, "metaCampaignName"),
        metaFormId:          get(r, "metaFormId"),
        metaFormName:        get(r, "metaFormName"),
        metaPageId:          get(r, "metaPageId"),
        metaPageName:        get(r, "metaPageName"),
        metaLeadgenId:       get(r, "metaLeadgenId"),
        metaPlatform:        get(r, "metaPlatform"),
        utmUrl:              get(r, "utmUrl"),
        utmMedium:           get(r, "utmMedium"),
        utmSource:           get(r, "utmSource"),
        utmCampaign:         get(r, "utmCampaign"),
        utmTerm:             get(r, "utmTerm"),
        utmContent:          get(r, "utmContent"),
        urgency:             get(r, "urgency"),
        investmentIntent:    get(r, "investmentIntent"),
        jobTitle:            get(r, "jobTitle"),
        monthlyBudget:       get(r, "monthlyBudget"),
        contactPreference:   get(r, "contactPreference"),
        mainChallenge:       get(r, "mainChallenge"),
        sector:              get(r, "sector"),
        classFrequency:      get(r, "classFrequency"),
        professionalMoment:  get(r, "professionalMoment"),
        externalId:          get(r, "externalId"),
        registeredAt:        get(r, "registeredAt"),
      });

      if (pipeline && matchStage) {
        const notes = [
          get(r, "firstNote"),
          get(r, "product")    ? `Produto: ${get(r, "product")} (R$ ${get(r, "productValue")})` : "",
          get(r, "city")       ? `Local: ${get(r, "city")}/${get(r, "state")}` : "",
          get(r, "urgency")    ? `Urgencia: ${get(r, "urgency")}` : "",
          get(r, "jobTitle")   ? `Cargo: ${get(r, "jobTitle")}` : "",
          get(r, "metaCampaignName") ? `Meta Campaign: ${get(r, "metaCampaignName")}` : "",
          get(r, "utmSource")  ? `UTM: ${get(r, "utmSource")} / ${get(r, "utmCampaign")}` : "",
        ].filter(Boolean).join(" | ");

        dealsToAdd.push({
          title:      name,
          pipelineId: pipeline.id,
          stageId:    matchStage.id,
          contact:    name,
          owner:      get(r, "owner") || DEFAULT_OWNER,
          value:      parseFloat(get(r, "productValue").replace(",", ".")) || 0,
          tags,
          notes,
        });
      }
      imported++;
    }

    addContacts(contactsToAdd);
    dealsToAdd.forEach((d) => addDeal(d));

    toast.success(`${imported} leads importados${skipped ? ` (${skipped} sem nome ignorados)` : ""}!`);
    router.push("/pipeline");
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const hasName     = Object.values(mapping).includes("name");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-5 xl:col-span-2">

          {/* Step 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" /> 1. Baixe o modelo
              </CardTitle>
              <CardDescription>
                Compatível com o export do seu CRM atual (68 colunas). Abra no Excel, cole seus leads e importe aqui.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="size-4" /> Baixar modelo (.csv)
              </Button>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5 text-primary" /> 2. Envie seu arquivo
              </CardTitle>
              <CardDescription>
                Aceita <strong>.xlsx</strong> (Excel) e <strong>.csv</strong>. Duplicatas são ignoradas automaticamente.
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
                  <><Loader2 className="size-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Processando {fileName}...</p></>
                ) : rows.length > 0 ? (
                  <>
                    <CheckCircle2 className="size-9 text-green-400" />
                    <div>
                      <p className="font-semibold text-green-400">{rows.length} leads carregados</p>
                      <p className="text-xs text-muted-foreground">{fileName} · clique para trocar</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="size-9 text-primary" />
                    <div>
                      <p className="font-semibold">Clique ou arraste o arquivo aqui</p>
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

          {/* Step 3 */}
          {headers.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Table2 className="size-5 text-primary" /> 3. Confirme o mapeamento
                    </CardTitle>
                    <CardDescription>
                      {mappedCount} de {headers.length} colunas mapeadas.
                      {!hasName && <span className="ml-1 font-medium text-destructive">Mapeie o Nome (obrigatório).</span>}
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
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      mapping[i] ? "border-primary/25 bg-primary/[0.03]" : "border-border"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{h || `Coluna ${i + 1}`}</p>
                      {preview && rows[0]?.[i] && <p className="truncate text-[10px] text-muted-foreground">ex: {rows[0][i]}</p>}
                    </div>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <select
                      value={mapping[i] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as FieldKey | "" }))}
                      className={cn(
                        "h-9 w-56 shrink-0 rounded-md border bg-background px-2 text-sm outline-none",
                        mapping[i] ? "border-primary/40 text-foreground" : "border-input text-muted-foreground"
                      )}
                    >
                      <option value="">Ignorar</option>
                      {SYSTEM_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="pt-3">
                  <Button onClick={doImport} disabled={!hasName} className="w-full gap-2" size="lg">
                    <CheckCircle2 className="size-4" /> Importar {rows.length} leads para o funil
                  </Button>
                  {!hasName && <p className="mt-2 text-center text-xs text-muted-foreground">Selecione "Nome do Lead" em alguma coluna.</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pré-visualização</CardTitle></CardHeader>
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
                    const name  = nC !== undefined ? r[Number(nC)] : r[0];
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
              <CardHeader><CardTitle className="text-sm">Destino no funil</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold text-sm">{pipelines[0].name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {pipelines[0].stages.map((s) => (
                    <span key={s.id} className="rounded-full border border-border bg-secondary/30 px-2 py-0.5 text-[10px]">{s.name}</span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Duplicatas (mesmo telefone, e-mail ou nome) são ignoradas automaticamente.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
