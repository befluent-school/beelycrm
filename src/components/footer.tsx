import Link from "next/link";
import { Logo } from "@/components/logo";
import { SITE } from "@/lib/site";

/** Global footer. The legal line is required on every screen of the system. */
export function SiteFooter({ minimal = false }: { minimal?: boolean }) {
  if (minimal) {
    return (
      <footer className="border-t border-border px-6 py-4">
        <p className="text-center text-xs text-muted-foreground">
          {SITE.footerLegal}
        </p>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border/60 bg-[#1c1c1c]">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            {SITE.tagline}.
          </p>
        </div>
        <FooterCol
          title="Produto"
          links={[
            ["Documentação", "/docs"],
            ["Integrações", "/docs/integracoes"],
            ["Referência da API", "/docs/api"],
          ]}
        />
        <FooterCol
          title="Conta"
          links={[
            ["Entrar", "/login"],
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            ["Termos de uso", "/docs/termos"],
            ["Privacidade", "/docs/privacidade"],
          ]}
        />
      </div>
      <div className="border-t border-border px-6 py-5">
        <p className="mx-auto max-w-7xl text-center text-xs text-muted-foreground">
          {SITE.footerLegal}
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
