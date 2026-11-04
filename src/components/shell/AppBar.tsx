"use client";

/** Compact top bar for the application surfaces (database + research). */
import Link from "next/link";
import Wordmark from "@/components/brand/Wordmark";
import CommandSearch from "@/components/search/CommandSearch";
import { cx } from "@/lib/format";

interface Props {
  onSearch: (q: string) => void;
  visible?: boolean;
  active?: "database" | "research";
}

export default function AppBar({ onSearch, visible = true, active }: Props) {
  return (
    <div
      inert={!visible}
      className={cx(
        "fixed inset-x-0 top-0 z-40 border-b border-line bg-black/80 backdrop-blur-md transition-[transform,opacity] duration-500 ease-out",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <nav aria-label="Primary" className="mx-auto grid max-w-[1440px] grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 md:h-16 md:grid-cols-[auto_minmax(0,560px)_1fr] md:gap-x-8 md:px-8 md:py-0">
        <Link href="/" aria-label="Pirate Wires home" className="shrink-0">
          <Wordmark size="sm" />
        </Link>
        <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2">
          <CommandSearch
            size="compact"
            onSubmit={onSearch}
            globalShortcut={active === "research"}
            placeholder="New research query"
          />
        </div>
        <div className="col-start-2 row-start-1 ml-auto flex items-center gap-1 font-mono text-[12px] md:col-start-3">
          <Link
            href="/#database"
            aria-current={active === "database" ? "page" : undefined}
            className={cx("px-3 py-2 transition-colors", active === "database" ? "text-paper" : "text-mute hover:text-paper")}
          >
            Database
          </Link>
          <Link
            href="/research"
            aria-current={active === "research" ? "page" : undefined}
            className={cx("px-3 py-2 transition-colors", active === "research" ? "text-paper" : "text-mute hover:text-paper")}
          >
            Research
          </Link>
        </div>
      </nav>
    </div>
  );
}
