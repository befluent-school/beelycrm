import { Sidebar } from "@/components/app/sidebar";
import { SiteFooter } from "@/components/footer";
import { StoreHydrator } from "@/components/store-hydrator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHydrator />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            {children}
            <SiteFooter minimal />
          </div>
        </div>
      </div>
    </>
  );
}
