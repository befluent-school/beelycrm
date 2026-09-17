import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Inbox,
  CalendarCheck,
  Zap,
  Mail,
  PhoneCall,
  BarChart3,
  Settings,
  Puzzle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAV: NavItem[] = [
  { label: "Business Intelligence", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contatos", href: "/contatos", icon: Users },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Atividades", href: "/atividades", icon: CalendarCheck },
  { label: "Automações", href: "/automacoes", icon: Zap },
  { label: "Remarketing", href: "/remarketing", icon: Mail },
  { label: "Ligações IA", href: "/ligacoes", icon: PhoneCall },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Integrações", href: "/integracoes", icon: Puzzle },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
