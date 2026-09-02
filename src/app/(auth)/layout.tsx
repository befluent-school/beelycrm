import Link from "next/link";
import { Logo } from "@/components/logo";
import { SITE } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Link href="/login" className="mb-8">
          <Logo />
        </Link>
        <div className="card-premium w-full max-w-md rounded-2xl p-8">
          {children}
        </div>
      </div>
      <footer className="px-6 py-4">
        <p className="text-center text-xs text-muted-foreground">{SITE.footerLegal}</p>
      </footer>
    </div>
  );
}
