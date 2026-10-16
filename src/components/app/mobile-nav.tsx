"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";

// Itens que aparecem na bottom bar mobile (os mais usados)
const MOBILE_NAV = NAV.filter((item) =>
  ["/dashboard", "/contatos", "/inbox", "/pipeline", "/configuracoes"].includes(item.href)
);

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Topbar mobile — logo + título da página atual */}
      <header className="flex h-14 items-center justify-between border-b border-border/70 bg-[#1e1e1e] px-4 lg:hidden">
        <span className="font-display text-base font-bold tracking-tight text-foreground">
          {NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ?? "Beely CRM"}
        </span>
      </header>

      {/* Bottom tab bar mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border/70 bg-[#1e1e1e] pb-safe lg:hidden">
        {MOBILE_NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "drop-shadow-[0_0_6px_var(--primary)]")} />
              <span className="truncate">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
