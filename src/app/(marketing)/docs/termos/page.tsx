import type { Metadata } from "next";
import { DocTitle, DocLead, DocH2, DocP } from "@/components/docs/doc";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <>
      <DocTitle>Termos de uso</DocTitle>
      <DocLead>Última atualização: 28 de maio de 2026.</DocLead>
      <DocH2>1. Aceitação</DocH2>
      <DocP>Ao utilizar o {SITE.name}, você concorda com estes termos. O serviço é fornecido por {SITE.footerLegal.replace("Desenvolvido por ", "")}</DocP>
      <DocH2>2. Conta e assinatura</DocH2>
      <DocP>O teste grátis dura 14 dias. Após esse período, é necessário um plano ativo para continuar usando o serviço. O cancelamento pode ser feito a qualquer momento.</DocP>
      <DocH2>3. Uso aceitável</DocH2>
      <DocP>É proibido usar a plataforma para envio de spam, conteúdo ilícito ou em violação às políticas das plataformas de mensageria integradas.</DocP>
      <DocH2>4. Limitação de responsabilidade</DocH2>
      <DocP>O serviço é fornecido &quot;como está&quot;. Envidamos os melhores esforços para garantir disponibilidade e segurança dos dados.</DocP>
    </>
  );
}
