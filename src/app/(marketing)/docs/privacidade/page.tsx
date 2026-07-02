import type { Metadata } from "next";
import { DocTitle, DocLead, DocH2, DocP } from "@/components/docs/doc";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return (
    <>
      <DocTitle>Política de Privacidade</DocTitle>
      <DocLead>Última atualização: 28 de maio de 2026 · Em conformidade com a LGPD.</DocLead>
      <DocH2>Dados que coletamos</DocH2>
      <DocP>Coletamos dados de cadastro (nome, e-mail) e os dados de CRM que você insere (contatos, negócios, conversas) para operar o {SITE.name}.</DocP>
      <DocH2>Como usamos</DocH2>
      <DocP>Usamos os dados exclusivamente para fornecer o serviço, processar pagamentos e oferecer suporte. Não vendemos seus dados a terceiros.</DocP>
      <DocH2>Mensageria</DocH2>
      <DocP>Ao conectar WhatsApp, Instagram ou Messenger, as mensagens são processadas conforme as políticas das respectivas plataformas e a LGPD.</DocP>
      <DocH2>Seus direitos</DocH2>
      <DocP>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail {SITE.email}.</DocP>
      <DocH2>Controlador</DocH2>
      <DocP>{SITE.footerLegal}</DocP>
    </>
  );
}
