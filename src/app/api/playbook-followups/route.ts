import { NextResponse } from "next/server";
import {
  getPlaybookTemplates,
  savePlaybookTemplate,
  type FollowupSituation,
} from "@/lib/followup-playbook-store";

export const dynamic = "force-dynamic";

const VALID_SITUATIONS: FollowupSituation[] = [
  "proposta_sumiu",
  "levar_pro_time",
  "reativacao_frio",
  "pediu_desconto_sumiu",
  "contrato_sem_retorno",
  "pediu_info_sumiu",
  "ultima_tentativa",
];

/** GET /api/playbook-followups — os 7 modelos por situação (Playbook 7.2/7.3). */
export async function GET() {
  const templates = await getPlaybookTemplates();
  return NextResponse.json(templates);
}

/** PUT /api/playbook-followups — atualiza um modelo. */
export async function PUT(request: Request) {
  let body: {
    situationKey?: string;
    channel?: string;
    message?: string;
    dayOffset?: number;
    suggestedTime?: string;
    active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.situationKey || !VALID_SITUATIONS.includes(body.situationKey as FollowupSituation)) {
    return NextResponse.json({ error: "situationKey inválido" }, { status: 400 });
  }

  await savePlaybookTemplate(body.situationKey as FollowupSituation, {
    channel: body.channel,
    message: body.message,
    dayOffset: body.dayOffset,
    suggestedTime: body.suggestedTime,
    active: body.active,
  });

  return NextResponse.json({ ok: true });
}
