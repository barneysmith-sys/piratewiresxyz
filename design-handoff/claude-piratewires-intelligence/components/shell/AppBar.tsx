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
      className={cx(
        "fixed inset-x-0 top-0 z-40 border-b border-line bg-black/80 backdrop-blur-md transition-[transform,opacity] duration-500 ease-out",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:gap-8 md:px-8">
        <Link href="/" aria-label="Pirate Wires home" className="shrink-0">
          <Wordmark size="sm" />
        </Link>
        <div className="hidden min-w-0 flex-1 md:block md:max-w-[560px]">
          <CommandSearch size="compact" onSubmit={onSearch} globalShortcut={false} placeholder="New research query" />
        </div>
        <div className="ml-auto flex items-center gap-1 font-mono text-[12px]">
          <Link
            href="/#database"
            aria-current={active === "database" ? "page" : undefined}
            className={cx("px-3 py-2 transition-colors", active === "database" ? "text-paper" : "text-mute hover:text-paper")}
          >
            Database
          </Link>
          <span
            aria-current={active === "research" ? "page" : undefined}
            className={cx("px-3 py-2", active === "research" ? "text-paper" : "text-mute")}
          >
            Research
          </span>
        </div>
      </nav>
    </div>
  );
}
