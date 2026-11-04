"use client";

import { useEffect, useState } from "react";
import { capitolCoords } from "@/lib/design/tokens";

/** Technical framing for the hero: corner crosshairs, coordinates, a quiet clock. Decorative. */
function Cross({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`absolute h-6 w-6 text-paper/45 ${className}`}>
      <path d="M12 0v24M0 12h24" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export default function HudFrame({ marker = "Demo data" }: { marker?: string }) {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", { hour12: false, timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const lat = `${capitolCoords.lat.toFixed(4)}° N`;
  const lon = `${Math.abs(capitolCoords.lon).toFixed(4)}° W`;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
      <Cross className="left-6 top-6 md:left-16 md:top-10" />
      <Cross className="right-6 top-6 md:right-16 md:top-10" />
      <Cross className="bottom-6 left-6 md:bottom-10 md:left-16" />
      <Cross className="bottom-6 right-6 md:bottom-10 md:right-16" />

      <div className="absolute bottom-[38px] left-16 hidden font-mono text-2xs uppercase text-mute md:block md:left-28">
        <span className="text-paper/70">{lat}</span>
        <span className="mx-2 text-mute-deep">/</span>
        <span className="text-paper/70">{lon}</span>
        <span className="ml-4">Capitol Hill · Washington, D.C.</span>
      </div>
      <div className="absolute bottom-[38px] right-16 hidden items-center gap-4 font-mono text-2xs uppercase text-mute md:flex md:right-28">
        <span className="tabular">{time} ET</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-signal" /> {marker}
        </span>
      </div>
    </div>
  );
}
