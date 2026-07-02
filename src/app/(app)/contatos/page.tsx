import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { ContactsTable } from "@/components/app/contacts-table";

export const metadata: Metadata = { title: "Contatos" };

export default function ContactsPage() {
  return (
    <>
      <Topbar title="Contatos" />
      <div className="p-6">
        <ContactsTable />
      </div>
    </>
  );
}
