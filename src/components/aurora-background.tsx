/**
 * Global atmospheric background — grafite base with orange glows, grid texture
 * and grain. Pure CSS/SVG, no animations to avoid constant repaints.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* deep base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#2a2a2a_0%,#1c1c1c_45%,#161616_100%)]" />

      {/* static orange glow — top center */}
      <div
        className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full blur-[120px] opacity-60"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, #e59313 20%, transparent), transparent 70%)" }}
      />
      {/* static orange glow — left */}
      <div
        className="absolute -left-32 top-1/3 size-[32rem] rounded-full blur-[120px] opacity-40"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, #e59313 12%, transparent), transparent 70%)" }}
      />
      {/* static dark glow — bottom right (grafite, no navy) */}
      <div
        className="absolute -right-40 bottom-0 size-[36rem] rounded-full blur-[130px] opacity-50"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, #2b2b2b 60%, transparent), transparent 70%)" }}
      />

      {/* grid texture */}
      <div className="bg-grid absolute inset-0 opacity-60" />

      {/* grain */}
      <div className="bg-noise absolute inset-0 opacity-[0.035] mix-blend-overlay" />

      {/* top hairline highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}
