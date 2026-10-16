import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { SiteFooter } from "@/components/footer";
import { StoreHydrator } from "@/components/store-hydrator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHydrator />
      <div className="flex h-svh flex-col overflow-hidden lg:flex-row">
        {/* Sidebar desktop (≥1024 px) */}
        <Sidebar />
        {/* Topbar + conteúdo + bottom nav mobile (<1024 px) */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileNav />
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
            {children}
            <SiteFooter minimal />
          </div>
        </div>
      </div>
    </>
  );
}
