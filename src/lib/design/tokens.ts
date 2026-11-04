/**
 * PIRATE WIRES / INTELLIGENCE — design tokens
 *
 * Single source of truth for colour, type and motion. Consumed by:
 *  - tailwind.config.ts      (utility classes)
 *  - the Three.js scene       (particle + node colours)
 *  - Recharts / SVG charts    (series colours)
 *
 * Keep the palette restrained: black, charcoal, off-white, grey, one red.
 */

export const color = {
  void: "#000000", // page ground, hero
  ink: {
    950: "#050505", // app ground below the hero
    900: "#0A0A0B", // panels
    850: "#0F0F10", // raised panels / table header
    800: "#151517", // hover rows, inputs
    700: "#1E1E21", // pressed
  },
  line: {
    faint: "rgba(255,255,255,0.06)",
    DEFAULT: "rgba(255,255,255,0.11)",
    strong: "rgba(255,255,255,0.22)",
    bright: "rgba(255,255,255,0.55)",
  },
  paper: {
    DEFAULT: "#EDEBE6", // primary text, particles
    dim: "#C9C7C1", // secondary text
  },
  mute: {
    DEFAULT: "#8C8C89", // labels (6.4:1 on #000)
    deep: "#5F5F5C", // decorative only, never for text that must be read
  },
  signal: {
    DEFAULT: "#E3262B", // the one accent
    hot: "#FF3B3F", // glows / active nodes
    dim: "#7A1518", // red on dark fills
    wash: "rgba(227,38,43,0.10)",
  },
} as const;

/** Ordered chart series. Red is reserved for "the thing being asked about". */
export const series = {
  focus: color.signal.DEFAULT,
  base: color.paper.DEFAULT,
  secondary: "#9B9B97",
  tertiary: "#5F5F5C",
  grid: "rgba(255,255,255,0.07)",
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

/** Washington, D.C. — the U.S. Capitol. Used by the HUD coordinate readouts. */
export const capitolCoords = { lat: 38.8899, lon: -77.0091 } as const;
