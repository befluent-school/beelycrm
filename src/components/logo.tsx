import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

/**
 * Beely logo — neutral geometric mark (hexagon + B), own identity.
 * Uses the brand palette but never the Be Fluent bee/symbol.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8", className)} aria-hidden="true">
      <path
        d="M20 2 L34.6 10.5 L34.6 29.5 L20 38 L5.4 29.5 L5.4 10.5 Z"
        className="fill-primary"
      />
      <path
        d="M14 11 h7.5 a5 5 0 0 1 0.6 9.96 A5.2 5.2 0 0 1 22.2 30 H14 Z M18 14.4 v3.4 h3.1 a1.7 1.7 0 0 0 0-3.4 Z M18 21 v5.4 h3.6 a2.05 2.05 0 0 0 0-5.4 Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showText && (
        <span className="font-display text-xl font-extrabold tracking-tight">
          {SITE.name}
        </span>
      )}
    </span>
  );
}
