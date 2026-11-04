"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { startAmbient } from "./ambient";
import "./opening-screen.css";

const PHRASES = [
  "Ask the archive anything...",
  "Analyze AI coverage performance...",
  "Discover emerging editorial opportunities...",
  "Identify audience growth opportunities...",
];

type Scope = "articles" | "topics" | "audience" | null;

export type OpeningScreenProps = {
  /** Existing research handler. Called only for non-empty queries. */
  onSearch?: (query: string, scope: Scope) => void;
  /** Background image path. */
  backgroundSrc?: string;
};

const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export default function OpeningScreen({ onSearch, backgroundSrc = "/pwi/dc-dusk.webp" }: OpeningScreenProps) {
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const [scope, setScope] = useState<Scope>(null);
  const [sent, setSent] = useState(false);
  const [time, setTime] = useState("--:--:--");

  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lights = useRef<HTMLCanvasElement | null>(null);
  const typingApi = useRef<{ start: (delay: number) => void; stop: () => void }>({
    start: () => undefined,
    stop: () => undefined,
  });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = { phrase: 0, char: 0, deleting: false };
    let timer: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const tick = () => {
      const phrase = PHRASES[state.phrase];
      if (!state.deleting) {
        state.char += 1;
        setTyped(phrase.slice(0, state.char));
        if (state.char >= phrase.length) {
          state.deleting = true;
          timer = setTimeout(tick, 2200);
          return;
        }
        timer = setTimeout(tick, 52 + Math.random() * 38);
      } else {
        state.char -= 1;
        setTyped(phrase.slice(0, state.char));
        if (state.char <= 0) {
          state.deleting = false;
          state.phrase = (state.phrase + 1) % PHRASES.length;
          timer = setTimeout(tick, 420);
          return;
        }
        timer = setTimeout(tick, 24);
      }
    };

    const start = (delay: number) => {
      stop();
      if (reduced) {
        setTyped(PHRASES[0]);
        return;
      }
      state.char = 0;
      state.deleting = false;
      setTyped("");
      timer = setTimeout(tick, delay);
    };

    typingApi.current = { start, stop };
    const update = () => setTime(clock.format(new Date()));
    update();
    const id = setInterval(update, 1000);
    start(1600);
    return () => {
      clearInterval(id);
      stop();
      if (sentTimer.current) clearTimeout(sentTimer.current);
    };
  }, []);

  useEffect(() => {
    const canvas = lights.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return startAmbient(canvas);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    if (onSearch) onSearch(next, scope);
    else event.currentTarget.dispatchEvent(new CustomEvent("pwi:search", { bubbles: true, detail: { query: next, scope } }));
    if (sentTimer.current) clearTimeout(sentTimer.current);
    setSent(true);
    sentTimer.current = setTimeout(() => setSent(false), 700);
  };

  const toggle = (next: Exclude<Scope, null>) => setScope((current) => (current === next ? null : next));
  const showGhost = !focused && !query;

  return (
    <section className="pw-root" aria-label="Opening">
      <div className="pw-stage" aria-hidden="true">
        <div className="pw-drift">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pw-bg" src={backgroundSrc} alt="" draggable={false} fetchPriority="high" />
          <canvas ref={lights} className="pw-lights" />
          <div className="pw-haze" />
          <div className="pw-glow pw-glow-capitol" />
          <div className="pw-glow pw-glow-drum" />
          <div className="pw-glow pw-glow-halo" />
          <div className="pw-glow pw-glow-lamp" />
        </div>
      </div>
      <div className="pw-scrim" aria-hidden="true" />

      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <svg key={corner} className={`pw-cross pw-cross-${corner} pw-ui`} aria-hidden="true" viewBox="0 0 36 36" fill="none" stroke="#f2f3f7" strokeWidth="1.6">
          <path d="M18 0v36M0 18h36" />
        </svg>
      ))}

      <header className="pw-brand pw-ui">
        <h1 className="pw-title">
          PIRATE WIRES<span className="pw-slash" aria-hidden="true" />
        </h1>
        <p className="pw-sub">INTELLIGENCE</p>
      </header>

      <div className="pw-search-wrap pw-ui">
        <form className={`pw-field${sent ? " is-sent" : ""}`} role="search" onSubmit={handleSubmit}>
          <svg className="pw-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#f2f3f7" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="7.2" />
            <path d="M16 16l5.5 5.5" />
          </svg>
          <label htmlFor="pw-q" className="pw-sr">
            Ask the archive anything
          </label>
          <div className="pw-input-box">
            <input
              id="pw-q"
              className="pw-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ask the archive anything..."
              value={query}
              onChange={(event) => {
                typingApi.current.stop();
                setQuery(event.target.value);
              }}
              onFocus={() => {
                typingApi.current.stop();
                setFocused(true);
              }}
              onBlur={() => {
                setFocused(false);
                if (!query) typingApi.current.start(1800);
              }}
            />
            {showGhost && (
              <div className="pw-ghost" aria-hidden="true">
                <span>{typed}</span>
                <span className="pw-caret" />
              </div>
            )}
          </div>
          <button className={`pw-submit${query.trim() ? " is-ready" : ""}`} type="submit" aria-label="Search the archive">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>

      <nav className="pw-chips pw-ui" aria-label="Search scope">
        <button className="pw-chip" type="button" aria-pressed={scope === "articles"} onClick={() => toggle("articles")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M15 7h6v6" />
          </svg>
          Articles
        </button>
        <button className="pw-chip" type="button" aria-pressed={scope === "topics"} onClick={() => toggle("topics")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L2 8l10 5 10-5-10-5z" />
            <path d="M2 12.5l10 5 10-5" />
            <path d="M2 17l10 5 10-5" />
          </svg>
          Topics
        </button>
        <button className="pw-chip" type="button" aria-pressed={scope === "audience"} onClick={() => toggle("audience")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3.6" />
            <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
            <path d="M15.5 4.6a3.6 3.6 0 0 1 0 6.8" />
            <path d="M18 14.3c2.2.7 3.5 2.8 3.5 5.7" />
          </svg>
          Audience
        </button>
      </nav>

      <footer className="pw-strip pw-ui">
        <span>38.8899° N / 77.0091° W</span>
        <span className="pw-strip-center">CAPITOL HILL — WASHINGTON, D.C.</span>
        <span className="pw-strip-right">
          <time suppressHydrationWarning>{time}</time>
          <span>ET</span>
          <span className="pw-demo">
            <span className="pw-dot" aria-hidden="true" />
            DEMO DATA
          </span>
        </span>
      </footer>
    </section>
  );
}
