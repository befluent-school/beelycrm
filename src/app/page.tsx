import { redirect } from "next/navigation";

/** Raiz do sistema: sem landing page pública — vai direto para o login. */
export default function RootPage() {
  redirect("/login");
}
