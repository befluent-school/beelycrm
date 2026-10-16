/**
 * POST /api/inbox/upload
 * Recebe um arquivo (multipart/form-data, campo "file") enviado pelo usuário
 * no Inbox e devolve a URL pública para ser passada ao /api/inbox/send.
 *
 * Estratégia: salva em /public/uploads/inbox/<timestamp>-<nome> e devolve
 * a URL relativa. Em produção com PM2 + Nginx, o Nginx serve /public
 * diretamente. Para ambientes sem disco persistente (containers efêmeros),
 * trocar por upload para S3/Cloudflare R2 usando a mesma interface.
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Limite de 25 MB por arquivo
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "multipart inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "campo 'file' ausente" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "arquivo muito grande (máx 25 MB)" }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Sanitiza o nome para evitar path traversal
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const fileName = `${Date.now()}-${safeName}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "inbox");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  const mediaUrl = `/uploads/inbox/${fileName}`;

  // Detecta tipo de mídia pela extensão
  const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
  const mediaType =
    ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? "image" :
    ["mp4", "mov", "avi", "webm"].includes(ext)         ? "video" :
    ["mp3", "ogg", "wav", "m4a", "opus", "aac"].includes(ext) ? "audio" :
    "document";

  return NextResponse.json({ ok: true, mediaUrl, mediaType, fileName: safeName });
}
