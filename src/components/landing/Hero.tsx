"use client";

import { ChevronDown } from "lucide-react";
import Wordmark from "@/components/brand/Wordmark";
import CommandSearch from "@/components/search/CommandSearch";
import { OPENING_QUERY } from "@/lib/search/suggestions";
import HudFrame from "./HudFrame";

interface Props {
  onSubmit: (query: string) => void;
  launching: boolean;
  /** element id to scroll to from the chevron */
  nextId: string;
  marker?: string;
}

/**
 * The opening frame: wordmark, the search, and nothing else.
 * The Capitol scene is rendered behind it by the page (it outlives the hero).
 */
export default function Hero({ onSubmit, launching, nextId, marker }: Props) {
  return (
    <section aria-label="Search" className="relative isolate flex h-[100svh] min-h-[600px] flex-col items-center px-4">
      <HudFrame marker={marker} />

      <header className="relative z-10 pt-8 md:pt-10">
        <h1 className="animate-rise">
          <Wordmark />
        </h1>
      </header>

      {/* soft dark field behind the search so the terrain never fights the text */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[47%] -z-0 h-[46vh] w-full max-w-[1200px] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(closest-side, rgba(0,0,0,0.78), rgba(0,0,0,0.35) 60%, transparent)" }}
      />

      <div
        className={`relative z-10 mt-[30vh] w-full max-w-[932px] transition-[opacity,transform,filter] duration-500 ease-out md:mt-[33vh] ${
          launching ? "translate-y-2 scale-[0.985] opacity-0 blur-[2px]" : ""
        }`}
      >
        <CommandSearch onSubmit={onSubmit} autoType={OPENING_QUERY} autoTypeDelay={1700} disabled={launching} />
      </div>

      <button
        type="button"
        onClick={() => document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth" })}
        className="absolute bottom-6 left-1/2 z-10 grid h-11 w-11 -translate-x-1/2 place-items-center text-paper/80 transition-colors hover:text-paper md:bottom-8"
        aria-label="Scroll to the Intelligence Database"
      >
        <ChevronDown className="h-6 w-6" strokeWidth={1.3} />
      </button>
    </section>
  );
}
