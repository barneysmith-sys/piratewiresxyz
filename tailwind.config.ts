import type { Config } from "tailwindcss";
import { color, motion } from "./src/lib/design/tokens";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: color.void,
        ink: color.ink,
        line: color.line,
        paper: color.paper,
        mute: color.mute,
        signal: color.signal,
        amber: color.amber,
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["10.5px", { lineHeight: "14px", letterSpacing: "0.08em" }],
      },
      transitionTimingFunction: {
        out: motion.ease.out,
        "in-out-quart": motion.ease.inOut,
      },
      keyframes: {
        blink: { "0%,49%": { opacity: "1" }, "50%,100%": { opacity: "0" } },
        rise: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scan: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(100%)" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
      },
      animation: {
        blink: "blink 1.05s steps(1) infinite",
        rise: `rise 420ms ${motion.ease.out} both`,
        scan: "scan 1.6s cubic-bezier(0.65,0,0.35,1) infinite",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
