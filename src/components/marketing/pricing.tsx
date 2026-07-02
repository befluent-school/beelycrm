import Link from "next/link";
import { Check, Zap, Crown } from "lucide-react";
import { PLANS, TRIAL_DAYS, type Plan } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
            Planos e preços
          </Badge>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Escolha o plano ideal para o seu time
          </h2>
          <p className="mt-4 text-muted-foreground">
            <strong className="text-foreground">{TRIAL_DAYS} dias grátis</strong> sem cartão de crédito.
            Faça upgrade ou downgrade a qualquer momento, sem fidelidade.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <p>Todos os planos incluem SSL, backups automáticos e suporte em português.</p>
          <p>
            Precisa de algo sob medida?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Fale com o time Enterprise →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const isFeatured = plan.highlight === "featured";
  const isPopular = plan.highlight === "popular";
  const isEnterprise = plan.id === "enterprise";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border transition-all",
        isFeatured
          ? "border-primary/60 bg-gradient-to-b from-primary/10 to-primary/5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_40%,transparent),0_24px_60px_-16px_color-mix(in_srgb,var(--primary)_30%,transparent)]"
          : "border-border/60 bg-[#222222] hover:border-border"
      )}
    >
      {/* Badge ribbon */}
      {plan.badge && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow",
              isFeatured ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            )}
          >
            {isFeatured && <Zap className="size-3" />}
            {isEnterprise && <Crown className="size-3" />}
            {plan.badge.replace(/^[^\w\s]+\s*/, "")}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* Plan name + tagline */}
        <div>
          <h3 className="font-display text-lg font-bold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{plan.tagline}</p>
        </div>

        {/* Price */}
        <div className="mt-6 flex items-baseline gap-1">
          <span className={cn("font-display text-4xl font-extrabold tracking-tight", isFeatured && "text-primary")}>
            {formatCurrency(plan.price)}
          </span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>

        {/* Limits grid */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Object.values(plan.limits).map((limit) => (
            <div key={limit} className="rounded-lg bg-white/[0.04] px-2.5 py-2 text-center">
              <span className="text-xs font-medium text-foreground/80 leading-tight">{limit}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          asChild
          variant={isFeatured ? "default" : isEnterprise ? "outline" : "secondary"}
          className={cn("mt-5 w-full font-semibold", isFeatured && "shadow-[0_4px_16px_-4px_color-mix(in_srgb,var(--primary)_50%,transparent)]")}
        >
          <Link href={isEnterprise ? "/signup?plan=enterprise" : `/signup?plan=${plan.id}`}>
            {plan.cta}
          </Link>
        </Button>

        {/* Divider */}
        <div className="my-6 border-t border-border/50" />

        {/* Features list */}
        <ul className="space-y-2.5">
          {plan.features.map((f) => {
            const isHeader = f.endsWith("mais:");
            return (
              <li key={f} className={cn("flex gap-2.5 text-sm", isHeader && "mt-1")}>
                {isHeader ? (
                  <span className="font-semibold text-foreground">{f}</span>
                ) : (
                  <>
                    <Check className={cn("mt-0.5 size-4 shrink-0", isFeatured ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-muted-foreground">{f}</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
