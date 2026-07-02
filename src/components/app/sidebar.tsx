"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { NAV } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/70 bg-[#1e1e1e] lg:flex">
      <div className="flex h-16 items-center border-b border-border/70 px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/20"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />}
              <Icon className="size-4.5 shrink-0 transition-transform group-hover:scale-110" />
              <span className="flex-1">{label}</span>
              {badge && <Badge variant="default" className="h-5 px-1.5 text-[10px]">{badge}</Badge>}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <div className="card-premium block rounded-xl p-4">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-semibold">Plano Enterprise</p>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">ATIVO</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Be Fluent Idiomas & Ensino LTDA</p>
          <div className="mt-2 text-[10px] text-muted-foreground">befluentschooll@gmail.com</div>
        </div>
      </div>
    </aside>
  );
}
