import { cn } from "@/lib/utils";

export function DocTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-3xl font-extrabold tracking-tight">{children}</h1>;
}

export function DocLead({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-lg text-muted-foreground">{children}</p>;
}

export function DocH2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-24 border-b border-border pb-2 font-display text-xl font-bold">
      {children}
    </h2>
  );
}

export function DocP({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-foreground/90">{children}</p>;
}

export function DocCode({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <pre className={cn("mt-4 overflow-x-auto rounded-lg border border-border bg-[#1c1c1c] p-4 text-xs leading-relaxed text-[#f5f5f5]", className)}>
      <code>{children}</code>
    </pre>
  );
}

export function DocList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-2 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
