import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { InboxView } from "@/components/app/inbox-view";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <>
      <Topbar title="Inbox" />
      <div className="p-6">
        <InboxView />
      </div>
    </>
  );
}
