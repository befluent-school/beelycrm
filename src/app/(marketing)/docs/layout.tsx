import Link from "next/link";

const DOC_NAV = [
  {
    title: "Começando",
    items: [
      ["Visão geral", "/docs"],
      ["Primeiros passos", "/docs#primeiros-passos"],
    ],
  },
  {
    title: "Módulos",
    items: [
      ["Contatos & Empresas", "/docs#contatos"],
      ["Pipeline & Negócios", "/docs#pipeline"],
      ["Inbox omnichannel", "/docs#inbox"],
      ["Automações & Scoring", "/docs#automacoes"],
    ],
  },
  {
    title: "Desenvolvedores",
    items: [
      ["Referência da API", "/docs/api"],
      ["Webhooks & N8N", "/docs/integracoes"],
      ["Conectar WhatsApp/IG", "/docs/integracoes#canais"],
    ],
  },
  {
    title: "Legal",
    items: [
      ["Termos de uso", "/docs/termos"],
      ["Privacidade", "/docs/privacidade"],
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl gap-10 px-6 py-12">
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav className="sticky top-24 space-y-6">
          {DOC_NAV.map((group) => (
            <div key={group.title}>
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
              <ul className="space-y-1">
                {group.items.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <article className="prose-docs min-w-0 flex-1">{children}</article>
    </div>
  );
}
