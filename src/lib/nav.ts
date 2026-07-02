import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Inbox,
  CalendarCheck,
  Zap,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contatos", href: "/contatos", icon: Users },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Inbox", href: "/inbox", icon: Inbox, badge: "3" },
  { label: "Atividades", href: "/atividades", icon: CalendarCheck },
  { label: "Automações", href: "/automacoes", icon: Zap },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Integrações", href: "/integracoes", icon: Puzzle },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
