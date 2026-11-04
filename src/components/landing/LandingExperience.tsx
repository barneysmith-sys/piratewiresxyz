"use client";

/**
 * Opening screen, then the intelligence database on the same page.
 * Search hands the query to the research workspace.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { launchStore } from "@/components/shell/launch";
import IntelligenceDatabase from "@/components/database/IntelligenceDatabase";
import OpeningScreen from "@/components/opening-screen/OpeningScreen";
import AppBar from "@/components/shell/AppBar";
import type { Article, ObservedRecord } from "@/lib/data/types";
import type { DatasetMode } from "@/lib/data/mode";
import { researchHref } from "@/lib/research/href";
import LaunchOverlay from "./LaunchOverlay";

export default function LandingExperience() {
  const router = useRouter();
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
      setBarVisible(window.scrollY > window.innerHeight * 0.82);
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
    (q: string, ids?: string[], lens?: string | null) => {
      const href = researchHref(q, ids, mode, lens);
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
    <div className="relative bg-void">
      <AppBar onSearch={(q) => startResearch(q)} visible={barVisible} active="database" />

      <div className="relative z-10">
        <OpeningScreen onSearch={(query, scope) => startResearch(query, undefined, scope)} />

        <div id="database" className="relative scroll-mt-16 border-t border-line bg-void">
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
