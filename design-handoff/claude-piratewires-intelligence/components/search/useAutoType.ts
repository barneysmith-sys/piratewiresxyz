"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  text: string;
  /** ms before the first keystroke (lets the scene assemble first) */
  startDelay?: number;
  enabled?: boolean;
  onDone?: () => void;
}

/**
 * Human-paced typing. Cadence varies per character, slows at word boundaries
 * and occasionally hesitates — it should read as someone typing, not a demo.
 * Call `stop()` the moment the user interacts; the hook never fights the user.
 */
export function useAutoType({ text, startDelay = 1400, enabled = true, onDone }: Options) {
  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const stop = useCallback(() => {
    stopped.current = true;
    if (timer.current) clearTimeout(timer.current);
    setActive(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    stopped.current = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTyped(text);
      timer.current = setTimeout(() => doneRef.current?.(), 300);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }

    let i = 0;
    const step = () => {
      if (stopped.current) return;
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        setActive(false);
        timer.current = setTimeout(() => !stopped.current && doneRef.current?.(), 380);
        return;
      }
      const ch = text[i - 1];
      const next = text[i];
      let delay = 48 + Math.random() * 46;
      if (ch === " ") delay += 40 + Math.random() * 50;
      if (ch === " " && Math.random() < 0.18) delay += 180 + Math.random() * 160; // a beat of thought
      if (next && next === next.toUpperCase() && next !== " ") delay += 30; // shift key
      timer.current = setTimeout(step, delay);
    };
    timer.current = setTimeout(() => {
      if (stopped.current) return;
      setActive(true);
      step();
    }, startDelay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, startDelay, enabled]);

  return { typed, active, stop };
}
