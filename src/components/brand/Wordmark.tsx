import { cx } from "@/lib/format";

/** PIRATE WIRES wordmark with the restrained red slash. Text, not an image, so it stays crisp and selectable. */
export default function Wordmark({ size = "lg", className }: { size?: "sm" | "lg"; className?: string }) {
  const lg = size === "lg";
  return (
    <span
      className={cx(
        "inline-flex items-center font-display font-bold uppercase leading-none text-paper",
        lg ? "gap-[0.32em] text-[44px] tracking-[-0.01em] sm:text-[56px] md:text-[64px]" : "gap-[0.3em] text-[22px] tracking-[0]",
        className
      )}
    >
      <span>Pirate Wires</span>
      <span aria-hidden className={cx("inline-block -skew-x-[22deg] bg-signal", lg ? "h-[0.78em] w-[0.07em]" : "h-[0.8em] w-[3px]")} />
    </span>
  );
}
