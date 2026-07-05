"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/app/copy-field";
import { CheckCircle2, Plus, Settings, Trash2, ExternalLink, AlertCircle, Info } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";

/* ── SVG logos oficiais ────────────────────────────────────── */
function LogoWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#25D366"/>
      <path d="M24 8C15.163 8 8 15.163 8 24c0 2.837.74 5.5 2.035 7.818L8 40l8.418-2.008A15.93 15.93 0 0024 40c8.837 0 16-7.163 16-16S32.837 8 24 8zm0 29.333a13.27 13.27 0 01-6.767-1.848l-.485-.288-5 1.193 1.215-4.854-.317-.5A13.236 13.236 0 0110.667 24C10.667 16.636 16.636 10.667 24 10.667S37.333 16.636 37.333 24 31.364 37.333 24 37.333zm7.27-9.904c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.63-.199-.896.2-.265.398-1.029 1.294-1.261 1.56-.232.265-.465.298-.863.1-.398-.2-1.681-.62-3.203-1.977-1.184-1.056-1.984-2.36-2.216-2.758-.232-.398-.025-.613.174-.812.18-.18.398-.465.597-.698.2-.232.265-.398.398-.664.132-.265.066-.498-.034-.697-.1-.2-.896-2.16-1.228-2.957-.323-.776-.651-.671-.896-.683-.232-.012-.498-.015-.763-.015-.265 0-.697.1-1.062.498-.365.398-1.394 1.362-1.394 3.322s1.427 3.853 1.626 4.118c.2.265 2.808 4.287 6.802 6.015.95.41 1.692.655 2.27.839.953.303 1.822.26 2.508.157.765-.113 2.354-.963 2.686-1.893.332-.93.332-1.728.232-1.893-.099-.166-.365-.265-.763-.465z" fill="white"/>
    </svg>
  );
}

function LogoInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#ig-grad)"/>
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="130%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <path d="M24 14c-2.72 0-3.06.012-4.123.06-1.062.049-1.788.218-2.423.465a4.895 4.895 0 00-1.77 1.153 4.895 4.895 0 00-1.153 1.77c-.247.635-.416 1.361-.465 2.423C14.012 20.94 14 21.28 14 24s.012 3.06.06 4.123c.049 1.062.218 1.788.465 2.423a4.895 4.895 0 001.153 1.77 4.895 4.895 0 001.77 1.153c.635.247 1.361.416 2.423.465C20.94 33.988 21.28 34 24 34s3.06-.012 4.123-.06c1.062-.049 1.788-.218 2.423-.465a4.895 4.895 0 001.77-1.153 4.895 4.895 0 001.153-1.77c.247-.635.416-1.361.465-2.423C33.988 27.06 34 26.72 34 24s-.012-3.06-.06-4.123c-.049-1.062-.218-1.788-.465-2.423a4.895 4.895 0 00-1.153-1.77 4.895 4.895 0 00-1.77-1.153c-.635-.247-1.361-.416-2.423-.465C27.06 14.012 26.72 14 24 14zm0 1.802c2.67 0 2.986.01 4.04.058.974.044 1.504.207 1.857.344.466.182.8.399 1.15.748.35.35.566.684.748 1.15.137.353.3.883.344 1.857.048 1.054.058 1.37.058 4.041 0 2.67-.01 2.986-.058 4.04-.044.974-.207 1.504-.344 1.857a3.098 3.098 0 01-.748 1.15 3.098 3.098 0 01-1.15.748c-.353.137-.883.3-1.857.344-1.054.048-1.37.058-4.04.058-2.671 0-2.987-.01-4.04-.058-.974-.044-1.504-.207-1.858-.344a3.098 3.098 0 01-1.15-.748 3.098 3.098 0 01-.747-1.15c-.137-.353-.3-.883-.344-1.857C15.812 26.986 15.802 26.67 15.802 24c0-2.67.01-2.986.058-4.04.044-.974.207-1.504.344-1.857.181-.466.399-.8.748-1.15.35-.35.683-.566 1.15-.748.353-.137.883-.3 1.857-.344 1.054-.048 1.37-.058 4.04-.058zM24 18.865a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 8.468a3.333 3.333 0 110-6.666 3.333 3.333 0 010 6.666zm5.338-9.87a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" fill="white"/>
    </svg>
  );
}

function LogoMessenger({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#msg-grad)"/>
      <defs>
        <linearGradient id="msg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00B2FF"/>
          <stop offset="100%" stopColor="#006AFF"/>
        </linearGradient>
      </defs>
      <path d="M24 9C15.716 9 9 15.26 9 23.056c0 4.297 1.87 8.132 4.874 10.785V39l4.83-2.656c1.29.353 2.657.546 4.076.546 8.284 0 15-6.26 15-14.056C37.78 15.26 32.284 9 24 9zm1.492 18.922l-3.822-4.072-7.455 4.072 8.206-8.714 3.916 4.072 7.361-4.072-8.206 8.714z" fill="white"/>
    </svg>
  );
}

function LogoTelegram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#2CA5E0"/>
      <path d="M35.928 12.892L10.08 22.6c-1.68.648-1.67 1.548-.308 1.95l6.586 1.998 15.247-9.395c.719-.443 1.38-.205.838.283L19.63 28.1l-.474 6.67c.696 0 1.004-.31 1.389-.68l3.337-3.163 6.94 4.981c1.279.688 2.2.333 2.52-1.158l4.558-21.012c.467-1.823-.712-2.649-2.072-1.846z" fill="white"/>
    </svg>
  );
}

function LogoTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#000"/>
      <path d="M32.97 17.47a7.43 7.43 0 01-4.33-1.38v9.9a8.55 8.55 0 11-7.4-8.44v4.74a3.82 3.82 0 103.57 3.81V9h4.17a7.43 7.43 0 007.43 7.44v4.17a11.56 11.56 0 01-3.44-.14z" fill="white"/>
    </svg>
  );
}

function LogoHotmart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FF4D00"/>
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Arial">H</text>
    </svg>
  );
}

function LogoKiwify({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00B27A"/>
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Arial">K</text>
    </svg>
  );
}

function LogoEduzz({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#F7A800"/>
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Arial">E</text>
    </svg>
  );
}

function LogoStripe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#635BFF"/>
      <path d="M22.5 20c0-.9.75-1.25 2-1.25 1.8 0 4.05.55 5.85 1.5V15.3c-1.95-.75-3.9-1.05-5.85-1.05-4.8 0-8 2.5-8 6.65 0 6.5 8.95 5.45 8.95 8.25 0 1.05-.9 1.4-2.2 1.4-1.9 0-4.35-.8-6.3-1.85v5.05c2.15.9 4.3 1.25 6.3 1.25 4.9 0 8.25-2.4 8.25-6.6-.05-7-8.95-5.75-8.95-8.4z" fill="white"/>
    </svg>
  );
}

function LogoMercadoPago({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#009EE3"/>
      <path d="M24 10C16.268 10 10 16.268 10 24s6.268 14 14 14 14-6.268 14-14S31.732 10 24 10zm6.8 15.4l-7.6 4.4a.8.8 0 01-1.2-.7v-8.8a.8.8 0 011.2-.7l7.6 4.4a.8.8 0 010 1.4z" fill="white"/>
    </svg>
  );
}

function LogoTypeform({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#262627"/>
      <path d="M14 18h20v3H25.5v15h-3V21H14v-3z" fill="white"/>
    </svg>
  );
}

function LogoJotform({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#F93C00"/>
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">JF</text>
    </svg>
  );
}

function LogoRDStation({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00ACC1"/>
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">RD</text>
    </svg>
  );
}

function LogoMake({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#6D00CC"/>
      <circle cx="17" cy="24" r="3" fill="white"/>
      <circle cx="31" cy="24" r="3" fill="white"/>
      <path d="M20 24h8" stroke="white" strokeWidth="2"/>
      <path d="M17 21V17m0 14v-4m14-10v4m0 10v-4" stroke="white" strokeWidth="2"/>
    </svg>
  );
}

function LogoZapier({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FF4A00"/>
      <path d="M24 10l2.4 8.6H35l-7 5.1 2.7 8.3L24 27l-6.7 5 2.7-8.3-7-5.1h8.6L24 10z" fill="white"/>
    </svg>
  );
}

function LogoN8N({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#EA4B71"/>
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">n8n</text>
    </svg>
  );
}

function LogoGoogleCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="white" stroke="#e5e7eb"/>
      <rect x="11" y="13" width="26" height="24" rx="3" fill="white" stroke="#4285F4" strokeWidth="2"/>
      <rect x="11" y="19" width="26" height="18" rx="0" fill="white"/>
      <rect x="11" y="19" width="26" height="18" fill="#4285F4" opacity="0.08"/>
      <path d="M20 12v4M28 12v4" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
      <path d="M11 20h26" stroke="#4285F4" strokeWidth="2"/>
      <text x="50%" y="72%" dominantBaseline="middle" textAnchor="middle" fill="#4285F4" fontSize="11" fontWeight="bold" fontFamily="Arial">G</text>
    </svg>
  );
}

function LogoCalendly({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#006BFF"/>
      <circle cx="24" cy="24" r="11" stroke="white" strokeWidth="2.5" fill="none"/>
      <path d="M24 18v6l4 2" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function LogoZoom({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#2D8CFF"/>
      <rect x="10" y="17" width="21" height="14" rx="3" fill="white"/>
      <path d="M31 21l7-4v14l-7-4V21z" fill="white"/>
    </svg>
  );
}

function LogoGoogleSheets({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#34A853"/>
      <rect x="13" y="10" width="22" height="28" rx="2" fill="white"/>
      <path d="M13 20h22M13 27h22M22 10v28" stroke="#34A853" strokeWidth="1.5"/>
    </svg>
  );
}

function LogoGA4({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#F9A825"/>
      <path d="M14 34V20l7 7 7-14 6 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function LogoHubspot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FF7A59"/>
      <circle cx="28" cy="18" r="4" fill="white"/>
      <circle cx="20" cy="28" r="6" fill="white" opacity="0.9"/>
      <path d="M24 22l-4 6" stroke="white" strokeWidth="2"/>
    </svg>
  );
}

function LogoActiveCampaign({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#356AE6"/>
      <path d="M12 30l8-12 6 8 4-5 6 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function LogoMailchimp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FFE01B"/>
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="#241C15" fontSize="11" fontWeight="bold" fontFamily="Arial">MC</text>
    </svg>
  );
}

function LogoPaypal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#003087"/>
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial">PP</text>
    </svg>
  );
}

function LogoAsaas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00A859"/>
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">A</text>
    </svg>
  );
}

function LogoWordPress({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#21759B"/>
      <circle cx="24" cy="24" r="13" stroke="white" strokeWidth="2" fill="none"/>
      <path d="M12 24h2M34 24h2M24 12v2M24 34v2" stroke="white" strokeWidth="1.5"/>
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">W</text>
    </svg>
  );
}

function LogoTwilio({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#F22F46"/>
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="20" cy="21" r="2" fill="white"/>
      <circle cx="28" cy="21" r="2" fill="white"/>
      <circle cx="20" cy="27" r="2" fill="white"/>
      <circle cx="28" cy="27" r="2" fill="white"/>
    </svg>
  );
}

function LogoShopify({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#96BF48"/>
      <path d="M30 14c-.1-.6-.6-1-1.2-.9l-2.2.4-.5-2.1c-.2-.6-.7-1-1.3-.9l-1.8.3-.4-1.8C23.4 8 22.7 7.6 22 8l-2 .4c-.6.1-1 .7-.9 1.3l.5 2.7-6 1.1 1.4 17.5 11.6 2.5L30 14zm-7.4-3.8l.3 1.5-1.3.2-.3-1.5 1.3-.2z" fill="white" opacity="0.9"/>
    </svg>
  );
}

function LogoMetaBusiness({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0866FF"/>
      <path d="M24 10C16.268 10 10 16.268 10 24s6.268 14 14 14 14-6.268 14-14S31.732 10 24 10zm-1 20.5v-9l7.5 4.5-7.5 4.5z" fill="white"/>
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="1.5" fill="none"/>
      <path d="M17 24c0-3.866 3.134-7 7-7 1.8 0 3.44.682 4.67 1.8" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

/* ── Catálogo de integrações ───────────────────────────────── */
interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  category: string;
  LogoComponent: React.ComponentType<{ className?: string }>;
  fields?: { name: string; label: string; placeholder?: string; required?: boolean }[];
  webhookSlug?: string;
  guideSteps?: string[];
  guideLink?: string;
  guideLinkLabel?: string;
}

const INTEGRATIONS: IntegrationDef[] = [
  // Mensageiros
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Receba e envie mensagens via Meta Cloud API, Z-API ou Evolution.",
    category: "Mensageiros",
    LogoComponent: LogoWhatsApp,
    fields: [
      { name: "phone_id", label: "Phone Number ID", placeholder: "1029384756", required: true },
      { name: "token", label: "Access Token", placeholder: "EAAB...", required: true },
    ],
    guideSteps: [
      "Acesse business.facebook.com e crie um App do tipo Business.",
      "No painel do App, adicione o produto 'WhatsApp'.",
      "Em WhatsApp > Configuração, copie o Phone Number ID.",
      "Gere um Access Token permanente em System Users > Gerar token.",
      "Cole ambos os valores abaixo e salve.",
    ],
  },
  {
    id: "instagram",
    name: "Instagram Direct",
    description: "Receba e responda DMs do Instagram diretamente no Beely via Meta Business Suite.",
    category: "Mensageiros",
    LogoComponent: LogoInstagram,
    webhookSlug: "instagram",
    fields: [
      { name: "ig_id", label: "Instagram Business Account ID", placeholder: "17841400...", required: true },
      { name: "token", label: "Page Access Token", placeholder: "EAAB...", required: true },
    ],
    guideSteps: [
      "Certifique-se que seu Instagram está no modo Conta Profissional (Empresa).",
      "Conecte a conta do Instagram à sua Página do Facebook em Configurações > Instagram.",
      "Acesse business.facebook.com e crie um App do tipo Business.",
      "Adicione o produto 'Instagram Graph API' no seu App.",
      "Em Instagram > Configuração Básica, copie o Instagram Business Account ID.",
      "Em Ferramentas > Explorador de API do Graph, gere um Page Access Token com permissões: instagram_basic, instagram_manage_messages, pages_manage_metadata.",
      "Cole o ID e o Token abaixo. O Webhook receberá as mensagens automaticamente.",
    ],
    guideLink: "https://business.facebook.com",
    guideLinkLabel: "Abrir Meta Business Suite",
  },
  {
    id: "messenger",
    name: "Messenger (Facebook)",
    description: "Receba e responda mensagens do Messenger da sua Página do Facebook no Beely.",
    category: "Mensageiros",
    LogoComponent: LogoMessenger,
    webhookSlug: "messenger",
    fields: [
      { name: "page_id", label: "Facebook Page ID", placeholder: "1029...", required: true },
      { name: "token", label: "Page Access Token", placeholder: "EAAB...", required: true },
    ],
    guideSteps: [
      "Acesse business.facebook.com e selecione sua Página.",
      "Vá em Configurações da Página > Mensagens e ative 'Permitir que pessoas enviem mensagens privadas'.",
      "Crie um App do tipo Business em business.facebook.com/apps.",
      "No App, adicione o produto 'Messenger'.",
      "Em Messenger > Configurações de Acesso, selecione a Página e gere um Page Access Token.",
      "Em Messenger > Webhooks, insira a URL do Webhook abaixo e o token de verificação 'beely2024'.",
      "Assine os eventos: messages, messaging_postbacks.",
    ],
    guideLink: "https://business.facebook.com",
    guideLinkLabel: "Abrir Meta Business Suite",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Bot do Telegram para atendimento e notificações.",
    category: "Mensageiros",
    LogoComponent: LogoTelegram,
    fields: [
      { name: "bot_token", label: "Bot Token", placeholder: "123456:ABC...", required: true },
    ],
    guideSteps: [
      "Abra o Telegram e procure por @BotFather.",
      "Envie /newbot e siga as instruções para criar seu bot.",
      "Copie o token gerado (formato: 123456:ABC-DEF...).",
      "Cole o token abaixo para ativar a integração.",
    ],
  },
  { id: "tiktok", name: "TikTok", description: "Receba mensagens de leads vindos do TikTok.", category: "Mensageiros", LogoComponent: LogoTikTok,
    guideSteps: ["Integração via TikTok Ads Manager. Configure o webhook nas campanhas de lead generation do TikTok.", "Copie a URL do Webhook abaixo e cole no painel de configuração do TikTok Ads."],
    webhookSlug: "tiktok", fields: [] },

  // E-commerce & Pagamentos
  { id: "hotmart",    name: "Hotmart", description: "Crie leads automaticamente a cada venda no Hotmart.", category: "E-commerce & Pagamentos", LogoComponent: LogoHotmart, webhookSlug: "hotmart",
    fields: [{ name: "secret", label: "Webhook Secret", placeholder: "hmac-secret", required: true }],
    guideSteps: ["Na Hotmart, acesse Ferramentas > Webhooks.", "Crie um novo webhook apontando para a URL abaixo.", "Copie o Secret gerado e cole no campo acima.", "Selecione os eventos: purchase.complete, purchase.canceled."] },
  { id: "kiwify",     name: "Kiwify", description: "Sincronize compradores da Kiwify como contatos.", category: "E-commerce & Pagamentos", LogoComponent: LogoKiwify,
    fields: [{ name: "token", label: "API Token", placeholder: "kwf_...", required: true }] },
  { id: "eduzz",      name: "Eduzz", description: "Importe clientes e produtos da Eduzz.", category: "E-commerce & Pagamentos", LogoComponent: LogoEduzz,
    fields: [{ name: "api_key", label: "API Key", placeholder: "edz_...", required: true }] },
  { id: "stripe",     name: "Stripe", description: "Acompanhe pagamentos e assine planos via Stripe.", category: "E-commerce & Pagamentos", LogoComponent: LogoStripe,
    fields: [{ name: "secret", label: "Secret Key", placeholder: "sk_live_...", required: true }] },
  { id: "mercadopago",name: "Mercado Pago", description: "Receba notificações de pagamentos Pix e cartão.", category: "E-commerce & Pagamentos", LogoComponent: LogoMercadoPago,
    fields: [{ name: "access_token", label: "Access Token", placeholder: "APP_USR-...", required: true }] },
  { id: "shopify",    name: "Shopify", description: "Sincronize pedidos e clientes da sua loja Shopify.", category: "E-commerce & Pagamentos", LogoComponent: LogoShopify, webhookSlug: "shopify",
    fields: [{ name: "shop", label: "Shop URL", placeholder: "minhaloja.myshopify.com", required: true }, { name: "token", label: "Admin API Token", placeholder: "shpat_...", required: true }] },
  { id: "paypal",     name: "PayPal", description: "Receba confirmações de pagamentos PayPal como eventos.", category: "E-commerce & Pagamentos", LogoComponent: LogoPaypal, webhookSlug: "paypal",
    fields: [{ name: "client_id", label: "Client ID", placeholder: "AaBb...", required: true }, { name: "secret", label: "Secret", placeholder: "...", required: true }] },
  { id: "asaas",      name: "ASAAS", description: "Gestão de cobranças e assinaturas com ASAAS.", category: "E-commerce & Pagamentos", LogoComponent: LogoAsaas,
    fields: [{ name: "api_key", label: "API Key", placeholder: "$aact_...", required: true }] },

  // Formulários & Captação
  { id: "typeform",   name: "Typeform", description: "Converta respostas de formulários em leads automaticamente.", category: "Formulários & Captação", LogoComponent: LogoTypeform, webhookSlug: "typeform",
    fields: [{ name: "token", label: "Personal Token", placeholder: "tfp_...", required: true }] },
  { id: "jotform",    name: "Jotform", description: "Capture leads de formulários Jotform.", category: "Formulários & Captação", LogoComponent: LogoJotform,
    fields: [{ name: "api_key", label: "API Key", placeholder: "...", required: true }] },
  { id: "rdstation",  name: "RD Station", description: "Sincronize leads e estágios com o RD Station Marketing.", category: "Formulários & Captação", LogoComponent: LogoRDStation,
    fields: [{ name: "token", label: "API Token", placeholder: "rds_...", required: true }] },
  { id: "wordpress",  name: "WordPress", description: "Capture leads de formulários Contact Form 7 e WPForms.", category: "Formulários & Captação", LogoComponent: LogoWordPress, webhookSlug: "wordpress",
    guideSteps: ["Instale o plugin 'WP Webhooks' no seu WordPress.", "Crie uma ação de envio de webhook apontando para a URL abaixo.", "Nenhuma API key necessária — a URL do webhook é suficiente."],
    fields: [] },

  // Automação & Fluxo
  { id: "make",    name: "Make (Integromat)", description: "Conecte o Beely a qualquer app via Make.", category: "Automação & Fluxo", LogoComponent: LogoMake, webhookSlug: "make",
    guideSteps: ["No Make, crie um novo Scenario.", "Adicione o módulo 'Webhooks > Custom webhook'.", "Copie a URL gerada pelo Make e cole nas configurações da integração de origem.", "Use a URL do Beely abaixo para enviar dados ao Beely."],
    fields: [] },
  { id: "zapier",  name: "Zapier", description: "Automatize tarefas com mais de 5.000 apps no Zapier.", category: "Automação & Fluxo", LogoComponent: LogoZapier, webhookSlug: "zapier",
    guideSteps: ["No Zapier, crie um novo Zap.", "Use 'Webhooks by Zapier' como Trigger.", "Cole a URL do Webhook do Beely abaixo como destino de um Action."],
    fields: [] },
  { id: "n8n",     name: "N8N", description: "Fluxos avançados de automação self-hosted com N8N.", category: "Automação & Fluxo", LogoComponent: LogoN8N, webhookSlug: "n8n",
    guideSteps: ["No N8N, crie um novo Workflow.", "Adicione o nó 'Webhook' como trigger.", "Configure um nó HTTP Request apontando para a URL do Beely abaixo."],
    fields: [] },
  { id: "twilio",  name: "Twilio", description: "Envie SMS e faça ligações automatizadas via Twilio.", category: "Automação & Fluxo", LogoComponent: LogoTwilio,
    fields: [{ name: "account_sid", label: "Account SID", placeholder: "AC...", required: true }, { name: "auth_token", label: "Auth Token", placeholder: "...", required: true }] },

  // Agenda & Reuniões
  { id: "google_cal", name: "Google Agenda", description: "Sincronize atividades e reuniões com o Google Calendar.", category: "Agenda & Reuniões", LogoComponent: LogoGoogleCalendar,
    fields: [{ name: "oauth", label: "OAuth Client ID", placeholder: "xxx.apps.googleusercontent.com", required: true }] },
  { id: "calendly",   name: "Calendly", description: "Crie atividades quando um agendamento Calendly é confirmado.", category: "Agenda & Reuniões", LogoComponent: LogoCalendly,
    fields: [{ name: "token", label: "Personal Token", placeholder: "eyJ...", required: true }] },
  { id: "zoom",       name: "Zoom", description: "Registre reuniões Zoom e links direto no negócio.", category: "Agenda & Reuniões", LogoComponent: LogoZoom,
    fields: [{ name: "api_key", label: "API Key", placeholder: "...", required: true }, { name: "api_secret", label: "API Secret", placeholder: "...", required: true }] },

  // E-mail Marketing
  { id: "mailchimp",       name: "Mailchimp", description: "Adicione contatos a listas e dispare campanhas de e-mail.", category: "E-mail Marketing", LogoComponent: LogoMailchimp,
    fields: [{ name: "api_key", label: "API Key", placeholder: "abc123-us1", required: true }] },
  { id: "activecampaign", name: "ActiveCampaign", description: "Automação de e-mail e CRM com ActiveCampaign.", category: "E-mail Marketing", LogoComponent: LogoActiveCampaign,
    fields: [{ name: "api_url", label: "Account URL", placeholder: "https://conta.api-us1.com", required: true }, { name: "api_key", label: "API Key", placeholder: "...", required: true }] },
  { id: "hubspot",         name: "HubSpot", description: "Sincronize contatos e negócios com o HubSpot CRM.", category: "E-mail Marketing", LogoComponent: LogoHubspot, webhookSlug: "hubspot",
    fields: [{ name: "token", label: "Private App Token", placeholder: "pat-na1-...", required: true }] },

  // Análise & Dados
  { id: "gsheets", name: "Google Sheets", description: "Exporte contatos e negócios para planilhas automaticamente.", category: "Análise & Dados", LogoComponent: LogoGoogleSheets,
    fields: [{ name: "sheet_id", label: "Spreadsheet ID", placeholder: "1BxiMVs...", required: true }] },
  { id: "ga4",     name: "Google Analytics 4", description: "Envie eventos de conversão para o GA4.", category: "Análise & Dados", LogoComponent: LogoGA4,
    fields: [{ name: "measurement_id", label: "Measurement ID", placeholder: "G-XXXXXX", required: true }, { name: "api_secret", label: "API Secret", placeholder: "...", required: true }] },
];

const CATEGORIES = [...new Set(INTEGRATIONS.map((i) => i.category))];

/* ── Modal de configuração ─────────────────────────────────── */
function ConfigModal({
  integration,
  existingCredentials,
  onSave,
  onDisconnect,
  onClose,
}: {
  integration: IntegrationDef;
  existingCredentials?: Record<string, string>;
  onSave: (credentials: Record<string, string>) => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://beelycrm.onrender.com";
  const { LogoComponent } = integration;
  const isConnected = !!existingCredentials;

  const [values, setValues] = useState<Record<string, string>>(() => {
    if (existingCredentials) return { ...existingCredentials };
    return {};
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState(!isConnected && !!integration.guideSteps);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const requiredFields = (integration.fields ?? []).filter((f) => f.required);
    const newErrors: Record<string, boolean> = {};
    for (const f of requiredFields) {
      if (!values[f.name]?.trim()) newErrors[f.name] = true;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(values);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <LogoComponent className="size-8 shrink-0" />
            {isConnected ? "Gerenciar" : "Conectar"} {integration.name}
          </DialogTitle>
          <DialogDescription>{integration.description}</DialogDescription>
        </DialogHeader>

        {/* Guia passo a passo */}
        {integration.guideSteps && (
          <div>
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex items-center gap-2 text-xs text-primary hover:underline mb-2"
            >
              <Info className="size-3.5" />
              {showGuide ? "Ocultar guia de configuração" : "Ver guia de configuração"}
            </button>
            {showGuide && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2 mb-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Como configurar</p>
                <ol className="space-y-1.5">
                  {integration.guideSteps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="size-4 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {integration.guideLink && (
                  <a
                    href={integration.guideLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    {integration.guideLinkLabel ?? integration.guideLink}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Campos de credenciais */}
          {integration.fields && integration.fields.length > 0 && (
            <div className="space-y-3">
              {integration.fields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    {f.label}
                    {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    name={f.name}
                    placeholder={f.placeholder}
                    value={values[f.name] ?? ""}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [f.name]: e.target.value }));
                      setErrors((v) => ({ ...v, [f.name]: false }));
                    }}
                    className={cn(errors[f.name] && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors[f.name] && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="size-3" /> Campo obrigatório
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* URL do Webhook */}
          {integration.webhookSlug && (
            <div className="space-y-1.5">
              <Label>URL do Webhook (cole no painel do provedor)</Label>
              <CopyField value={`${appUrl}/api/webhooks/${integration.webhookSlug}`} />
            </div>
          )}

          {/* Sem campos e sem webhook */}
          {(!integration.fields || integration.fields.length === 0) && !integration.webhookSlug && (
            <p className="text-sm text-muted-foreground">Esta integração é configurada via OAuth. Clique em conectar para autorizar.</p>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            {isConnected && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onDisconnect();
                }}
              >
                <Trash2 className="size-3.5" /> Desconectar
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {isConnected ? "Salvar alterações" : "Conectar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Card de integração ────────────────────────────────────── */
function IntegrationCard({
  integration,
  connected,
  onConnect,
}: {
  integration: IntegrationDef;
  connected: boolean;
  onConnect: (id: string) => void;
}) {
  const { LogoComponent } = integration;
  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-xl border p-4 transition-all",
      connected ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-white/[0.03]"
    )}>
      <div className="flex items-start justify-between gap-2">
        <LogoComponent className="size-10 shrink-0 rounded-xl" />
        {connected && (
          <Badge variant="success" className="flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="size-3" /> Conectado
          </Badge>
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{integration.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{integration.description}</p>
      </div>
      <Button
        size="sm"
        variant={connected ? "outline" : "default"}
        className="w-full"
        onClick={() => onConnect(integration.id)}
      >
        {connected ? (
          <><Settings className="size-3.5" /> Gerenciar</>
        ) : (
          <><Plus className="size-3.5" /> Conectar</>
        )}
      </Button>
    </div>
  );
}

/* ── View principal ────────────────────────────────────────── */
export function IntegrationsView() {
  const hydrated = useHydrated();
  const integrations = useStore((s) => s.integrations);
  const saveIntegration = useStore((s) => s.saveIntegration);
  const removeIntegration = useStore((s) => s.removeIntegration);

  const [activeCategory, setActiveCategory] = useState("Todos");
  const [configuring, setConfiguring] = useState<IntegrationDef | null>(null);

  const filtered = activeCategory === "Todos"
    ? INTEGRATIONS
    : INTEGRATIONS.filter((i) => i.category === activeCategory);

  function handleConnect(id: string) {
    const integration = INTEGRATIONS.find((i) => i.id === id);
    if (integration) setConfiguring(integration);
  }

  function handleSave(credentials: Record<string, string>) {
    if (!configuring) return;
    saveIntegration(configuring.id, credentials);
    toast.success(`${configuring.name} conectado com sucesso!`);
    setConfiguring(null);
  }

  function handleDisconnect() {
    if (!configuring) return;
    removeIntegration(configuring.id);
    toast.success(`${configuring.name} desconectado.`);
    setConfiguring(null);
  }

  if (!hydrated) return null;

  const connectedCount = Object.keys(integrations).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          {["Todos", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                activeCategory === cat
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              {cat}
              {cat === "Todos" && (
                <span className="ml-1.5 text-[10px] opacity-60">{INTEGRATIONS.length}</span>
              )}
            </button>
          ))}
        </div>
        {connectedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            <CheckCircle2 className="inline size-3 text-primary mr-1" />
            {connectedCount} {connectedCount === 1 ? "integração ativa" : "integrações ativas"}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connected={!!integrations[integration.id]}
            onConnect={handleConnect}
          />
        ))}
      </div>

      {configuring && (
        <ConfigModal
          integration={configuring}
          existingCredentials={integrations[configuring.id]?.credentials}
          onSave={handleSave}
          onDisconnect={handleDisconnect}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  );
}
