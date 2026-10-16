import { NextResponse } from "next/server";
import { db as client, schema } from "@/db/index";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!client) {
    return NextResponse.json({ name: null, email: null, plan: null });
  }
  try {
    const rows = await client.select({
      name: schema.organizations.name,
      email: schema.organizations.email,
      plan: schema.organizations.plan,
    }).from(schema.organizations).limit(1);

    const org = rows[0] ?? null;
    return NextResponse.json({
      name: org?.name ?? null,
      email: org?.email ?? null,
      plan: org?.plan ?? null,
    });
  } catch {
    return NextResponse.json({ name: null, email: null, plan: null });
  }
}
