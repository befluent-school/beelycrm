import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { GlobalSearch } from "./global-search";
import { QuickAdd } from "./quick-add";
import { Notifications } from "./notifications";
import { DEMO_USER } from "@/lib/demo-data";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/70 bg-[#1c1c1c] px-4 sm:px-6">
      <MobileNav />
      <h1 className="font-display text-lg font-bold">{title}</h1>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <QuickAdd />
        <Notifications />
        <div className="ml-1">
          <UserMenu name={DEMO_USER.name} email={DEMO_USER.email} />
        </div>
      </div>
    </header>
  );
}
