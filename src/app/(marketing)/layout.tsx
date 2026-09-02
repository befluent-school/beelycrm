import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/footer";

/**
 * Layout das páginas institucionais remanescentes (documentação e legais).
 * A landing page pública foi removida — a raiz do sistema vai direto ao login.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-[#1c1c1c]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/login">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/docs" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Documentação
            </Link>
            <Link href="/docs/integracoes" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Integrações
            </Link>
          </nav>
          <Button asChild size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
