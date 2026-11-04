"use client";

/**
 * One continuous environment:
 *   hero (Capitol scene + search)  →  terrain flattens into a lattice  →  the Intelligence Database.
 *
 * The scene is fixed behind everything and driven by a scroll-progress ref,
 * so scrolling never re-renders React.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { launchStore } from "@/components/shell/launch";
import CapitolScene from "@/components/scene/CapitolScene";
import IntelligenceDatabase from "@/components/database/IntelligenceDatabase";
import AppBar from "@/components/shell/AppBar";
import { getArticles } from "@/lib/data/articles";
import type { Article, ObservedRecord } from "@/lib/data/types";
import type { DatasetMode } from "@/lib/data/mode";
import { researchHref } from "@/lib/research/href";
import Hero from "./Hero";
import LaunchOverlay from "./LaunchOverlay";

export default function LandingExperience() {
  const router = useRouter();
  const progress = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  const launchQuery = useSyncExternalStore(launchStore.subscribe, launchStore.get, () => null);
  const [mode, setMode] = useState<DatasetMode>("demo");
  const [articles, setArticles] = useState<Article[]>([]);
  const [observed, setObserved] = useState<ObservedRecord[]>([]);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [loadingArchive, setLoadingArchive] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingArchive(true);
    setArchiveError(null);
    fetch(`/api/articles?mode=${mode}`, { signal: ctrl.signal })
      .then(async (response) => {
        const body = (await response.json()) as {
          data?: { articles: Article[]; observed: ObservedRecord[] };
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(body.error?.message ?? "Articles could not be loaded.");
        setArticles(body.data?.articles ?? []);
        setObserved(body.data?.observed ?? []);
        setLoadingArchive(false);
      })
      .catch((error: unknown) => {
        if ((error as Error).name === "AbortError") return;
        if (mode === "demo") {
          setArticles(getArticles());
          setObserved([]);
          setArchiveError(null);
          setLoadingArchive(false);
          return;
        }
        setArchiveError((error as Error).message);
        setArticles([]);
        setObserved([]);
        setLoadingArchive(false);
      });
    return () => ctrl.abort();
  }, [mode]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, window.scrollY / (vh * 1.05)));
      progress.current = p;
      if (sceneRef.current) sceneRef.current.style.opacity = String(1 - Math.max(0, (p - 0.75) / 0.25));
      setBarVisible(window.scrollY > vh * 0.82);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const startResearch = useCallback(
    (q: string, ids?: string[]) => {
      const href = researchHref(q, ids, mode);
      router.prefetch(href);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        launchStore.set(q);
        window.setTimeout(() => launchStore.set(null), 1100);
      }
      window.setTimeout(() => router.push(href), reduced ? 0 : 900);
    },
    [router, mode]
  );

  return (
    <div className="relative bg-black">
      <div ref={sceneRef} className="fixed inset-0 z-0 will-change-[opacity]">
        <CapitolScene progress={progress} className="absolute inset-0" />
      </div>

      <AppBar onSearch={(q) => startResearch(q)} visible={barVisible} active="database" />

      <div className="relative z-10">
        <Hero onSubmit={(q) => startResearch(q)} launching={!!launchQuery} nextId="database" marker={mode === "demo" ? "Demo data" : "Observed only"} />

        {/* the hand-off: the land settles into the lattice the app sits on */}
        <div aria-hidden className="relative h-[38vh]">
          <div className="pw-lattice absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/85" />
        </div>

        <div id="database" className="relative scroll-mt-16 bg-black/85">
          <div aria-hidden className="pw-lattice pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative mx-auto max-w-[1440px] px-4 pb-24 pt-10 md:px-8">
            <IntelligenceDatabase
              articles={articles}
              observed={observed}
              mode={mode}
              onMode={setMode}
              loading={loadingArchive}
              error={archiveError}
              onResearch={startResearch}
            />
          </div>
          <footer className="relative border-t border-line">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-6 font-mono text-2xs uppercase text-mute md:px-8">
              <span>Pirate Wires · Internal</span>
              <span>{mode === "demo" ? "Illustrative corpus · not Pirate Wires performance" : "Observed records only · illustrative rows excluded"}</span>
            </div>
          </footer>
        </div>
      </div>

      <LaunchOverlay query={launchQuery} />
    </div>
  );
}
