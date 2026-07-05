import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST() {
  // Sinaliza ao cliente para remover o flag e re-migrar
  return NextResponse.json({ ok: true, action: "clear_migration_flag" });
}
