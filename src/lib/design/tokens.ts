/**
 * PIRATE WIRES / INTELLIGENCE — design tokens
 *
 * Midnight navy ground, warm ivory type, one red for the active signal,
 * amber for a secondary comparison. The opening screen keeps its own dusk
 * palette so the pixel city stays atmospheric.
 */

export const color = {
  void: "#080D1B",
  ink: {
    950: "#080D1B",
    900: "#10182A",
    850: "#17213A",
    800: "#202B40",
    700: "#2A3650",
  },
  line: {
    faint: "rgba(48,59,80,0.72)",
    DEFAULT: "#303B50",
    strong: "#46526A",
    bright: "rgba(243,240,233,0.55)",
  },
  paper: {
    DEFAULT: "#F3F0E9",
    dim: "#C5CDDA",
  },
  mute: {
    DEFAULT: "#A3AEC0",
    deep: "#6E7A90",
  },
  signal: {
    DEFAULT: "#E31B2B",
    hot: "#E31B2B",
    dim: "#7A1822",
    wash: "rgba(227,27,43,0.12)",
  },
  amber: "#D9A45B",
} as const;

/** Red is the subject under study. Amber is the comparison. */
export const series = {
  focus: color.signal.DEFAULT,
  base: color.paper.DEFAULT,
  secondary: color.amber,
  tertiary: color.mute.DEFAULT,
  grid: "rgba(48,59,80,0.95)",
} as const;

export const font = {
  display: "var(--font-display)",
  mono: "var(--font-mono)",
  sans: "var(--font-sans)",
} as const;

export const motion = {
  ease: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  },
  duration: { fast: 140, base: 240, slow: 520, cinematic: 1100 },
} as const;

/** Washington, D.C. — the U.S. Capitol. Used by the opening-screen readout. */
export const capitolCoords = { lat: 38.8899, lon: -77.0091 } as const;
