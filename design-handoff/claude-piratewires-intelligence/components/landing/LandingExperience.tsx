"use client";

/**
 * One continuous environment:
 *   hero (Capitol scene + search)  →  terrain flattens into a lattice  →  the Intelligence Database.
 *
 * The scene is fixed behind everything and driven by a scroll-progress ref,
 * so scrolling never re-renders React.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import CapitolScene from "@/components/scene/CapitolScene";
import IntelligenceDatabase from "@/components/database/IntelligenceDatabase";
import AppBar from "@/components/shell/AppBar";
import { getArticles } from "@/lib/data/articles";
import { researchHref } from "@/lib/research/href";
import Hero from "./Hero";
import LaunchOverlay from "./LaunchOverlay";

export default function LandingExperience() {
  const router = useRouter();
  const progress = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  const [launch, setLaunch] = useState<{ q: string; ids?: string[] } | null>(null);

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
      setLaunch({ q, ids });
      router.prefetch(researchHref(q, ids));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => router.push(researchHref(q, ids)), reduced ? 0 : 900);
    },
    [router]
  );

  return (
    <div className="relative bg-black">
      <div ref={sceneRef} className="fixed inset-0 z-0 will-change-[opacity]">
        <CapitolScene progress={progress} className="absolute inset-0" />
      </div>

      <AppBar onSearch={(q) => startResearch(q)} visible={barVisible} active="database" />

      <div className="relative z-10">
        <Hero onSubmit={(q) => startResearch(q)} launching={!!launch} nextId="database" />

        {/* the hand-off: the land settles into the lattice the app sits on */}
        <div aria-hidden className="relative h-[38vh]">
          <div className="pw-lattice absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/85" />
        </div>

        <div id="database" className="relative scroll-mt-16 bg-black/85">
          <div aria-hidden className="pw-lattice pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative mx-auto max-w-[1440px] px-4 pb-24 pt-10 md:px-8">
            <IntelligenceDatabase articles={getArticles()} onResearch={startResearch} />
          </div>
          <footer className="relative border-t border-line">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-6 font-mono text-2xs uppercase text-mute md:px-8">
              <span>Pirate Wires · Internal</span>
              <span>Prototype interface · all records are demo data</span>
            </div>
          </footer>
        </div>
      </div>

      <LaunchOverlay query={launch?.q ?? null} />
    </div>
  );
}
