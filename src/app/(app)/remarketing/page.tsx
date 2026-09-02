import type { Metadata } from "next";
import { Topbar } from "@/components/app/topbar";
import { RemarketingView } from "@/components/app/remarketing-view";

export const metadata: Metadata = { title: "Remarketing" };

export default function RemarketingPage() {
  return (
    <>
      <Topbar title="Remarketing" />
      <RemarketingView />
    </>
  );
}
