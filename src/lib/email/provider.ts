/** Contrato comum de provedor de e-mail para remarketing. */

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  /** Cabeçalhos extras (ex.: X-Beely-Send-Id para rastreio). */
  headers?: Record<string, string>;
  fromEmail?: string;
  fromName?: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** ID da mensagem no provedor (Gmail: id; Resend: id). */
  id?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: "gmail" | "resend";
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

/** Monta uma mensagem MIME RFC 2822 (multipart/alternative) e devolve em base64url. */
export function buildRawMime(input: SendEmailInput & { fromEmail: string; fromName?: string }): string {
  const boundary = `beely_${Math.random().toString(36).slice(2)}`;
  const fromHeader = input.fromName
    ? `${encodeHeaderWord(input.fromName)} <${input.fromEmail}>`
    : input.fromEmail;
  const toHeader = input.toName
    ? `${encodeHeaderWord(input.toName)} <${input.to}>`
    : input.to;

  const lines: string[] = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${encodeHeaderWord(input.subject)}`,
    "MIME-Version: 1.0",
  ];
  for (const [k, v] of Object.entries(input.headers ?? {})) lines.push(`${k}: ${v}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`, "");

  const textPart = input.text ?? stripHtml(input.html);
  lines.push(
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    chunk64(Buffer.from(textPart, "utf-8").toString("base64")),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    chunk64(Buffer.from(input.html, "utf-8").toString("base64")),
    `--${boundary}--`,
    "",
  );

  const raw = lines.join("\r\n");
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeHeaderWord(s: string): string {
  // RFC 2047 encoded-word para caracteres não-ASCII (acentos em nomes/assunto).
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf-8").toString("base64")}?=`;
}

function chunk64(s: string): string {
  return s.replace(/(.{76})/g, "$1\r\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
