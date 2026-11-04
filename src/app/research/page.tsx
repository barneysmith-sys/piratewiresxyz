import type { Metadata } from "next";
import { Suspense } from "react";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";

export const metadata: Metadata = { title: "Research · Pirate Wires" };

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-void" />}>
      <ResearchWorkspace />
    </Suspense>
  );
}
