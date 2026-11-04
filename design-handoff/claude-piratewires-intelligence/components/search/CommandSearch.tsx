"use client";

/**
 * <CommandSearch />
 *
 * Terminal-style research input with an ARIA combobox suggestion list.
 *
 *  ⌘K / Ctrl+K / "/"   focus from anywhere
 *  ↑ ↓                 move through suggestions
 *  Tab                 accept the highlighted suggestion into the input
 *  Enter               run the highlighted suggestion, or exactly what you typed
 *  Esc                 close suggestions, then blur
 *
 * On the landing page it types an opening query by itself; any interaction
 * stops that immediately and hands control to the user.
 */
import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { FEATURED, rankSuggestions, type Suggestion } from "@/lib/search/suggestions";
import { useAutoType } from "./useAutoType";

interface Props {
  onSubmit: (query: string) => void;
  /** If set, the input types this by itself on mount. */
  autoType?: string;
  autoTypeDelay?: number;
  size?: "hero" | "compact";
  placeholder?: string;
  /** Register the global ⌘K / "/" shortcut (only one instance should). */
  globalShortcut?: boolean;
  disabled?: boolean;
  className?: string;
}

const KIND_LABEL: Record<Suggestion["kind"], string> = {
  research: "Full analysis",
  compare: "Compare",
  articles: "Articles",
  distribution: "Distribution",
  audience: "Audience",
};

export default function CommandSearch({
  onSubmit,
  autoType,
  autoTypeDelay,
  size = "hero",
  placeholder = "Ask the archive anything",
  globalShortcut = true,
  disabled,
  className,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [userDriven, setUserDriven] = useState(!autoType);
  const [isMac, setIsMac] = useState(true);
  // true while the field still holds the demo query: the first printable key replaces it
  const pristine = useRef(!!autoType);

  useEffect(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  const auto = useAutoType({
    text: autoType ?? "",
    enabled: !!autoType,
    startDelay: autoTypeDelay,
    onDone: () => {
      setOpen(true);
      setActive(0);
    },
  });

  // mirror the typed text while the demo is running
  useEffect(() => {
    if (!userDriven) setValue(auto.typed);
  }, [auto.typed, userDriven]);

  const takeOver = useCallback(() => {
    if (userDriven) return;
    auto.stop();
    setUserDriven(true);
  }, [auto, userDriven]);

  // while the opening demo owns the field, show the curated set; afterwards rank against what the user types
  const featured = !userDriven || pristine.current || !value.trim();
  const suggestions = useMemo(() => (featured ? FEATURED : rankSuggestions(value)), [value, featured]);

  const submit = useCallback(
    (q: string) => {
      const query = q.trim();
      if (!query || disabled) return;
      takeOver();
      setOpen(false);
      setValue(query);
      onSubmit(query);
    },
    [disabled, onSubmit, takeOver]
  );

  // a suggestion list left open by the demo shouldn't follow the page on scroll
  useEffect(() => {
    if (!open || focused) return;
    const onScroll = () => window.scrollY > 120 && setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open, focused]);

  // global shortcuts
  useEffect(() => {
    if (!globalShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [globalShortcut]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    takeOver();
    if (pristine.current && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      pristine.current = false;
      setValue(e.key);
      setActive(-1);
      setOpen(true);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        setActive((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setOpen(true);
        setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        break;
      case "Tab":
        if (open && active >= 0 && suggestions[active]) {
          e.preventDefault();
          pristine.current = false;
          setValue(suggestions[active].text);
          setActive(-1);
        }
        break;
      case "Enter":
        e.preventDefault();
        submit(open && active >= 0 && suggestions[active] ? suggestions[active].text : value);
        break;
      case "Escape":
        if (open) setOpen(false);
        else inputRef.current?.blur();
        break;
    }
  };

  const hero = size === "hero";
  const showList = open && suggestions.length > 0;
  const activeId = active >= 0 ? `${listId}-opt-${active}` : undefined;

  return (
    <div className={cx("relative w-full", className)}>
      {/* input */}
      <div
        className={cx(
          "group relative flex items-center rounded-[10px] border bg-black/70 backdrop-blur-md transition-[border-color,box-shadow] duration-200 ease-out",
          focused ? "border-paper/70 shadow-[0_0_0_4px_rgba(237,235,230,0.05)]" : "border-paper/35 hover:border-paper/60",
          hero ? "h-[60px] px-5 md:h-[72px] md:px-6" : "h-12 px-4"
        )}
      >
        <Search aria-hidden className={cx("shrink-0 text-paper", hero ? "h-5 w-5 md:h-[22px] md:w-[22px]" : "h-4 w-4")} strokeWidth={1.6} />
        <div className="relative ml-4 min-w-0 flex-1">
          <label htmlFor={`${listId}-input`} className="sr-only">
            Research query
          </label>
          <input
            id={`${listId}-input`}
            ref={inputRef}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              takeOver();
              pristine.current = false;
              setValue(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            onPointerDown={takeOver}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => {
              setFocused(false);
              setTimeout(() => setOpen(false), 120);
            }}
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${listId}-list`}
            aria-activedescendant={showList ? activeId : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={userDriven ? placeholder : ""}
            className={cx(
              "w-full bg-transparent font-mono text-paper caret-signal outline-none placeholder:text-mute",
              hero ? "text-[14px] tracking-[0.01em] sm:text-[17px] md:text-[22px]" : "text-[14px]",
              !focused && "caret-transparent"
            )}
          />
          {/* custom block caret when the field isn't focused (auto-type + idle) */}
          {!focused && (hero || value) && (
            <div
              aria-hidden
              className={cx(
                "pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre font-mono",
                hero ? "text-[14px] tracking-[0.01em] sm:text-[17px] md:text-[22px]" : "text-[14px]"
              )}
            >
              <span className="invisible">{value}</span>
              <span className={cx("ml-[1px] inline-block w-[2px] bg-signal", hero ? "h-[1.15em]" : "h-[1.1em]", !auto.active && "animate-blink")} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => submit(open && active >= 0 && suggestions[active] ? suggestions[active].text : value)}
          disabled={!value.trim() || disabled}
          aria-label="Run research"
          className="group/btn -mr-2 ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-md text-paper transition-colors duration-150 hover:bg-paper/[0.06] disabled:opacity-40"
        >
          <ArrowRight
            aria-hidden
            className={cx("transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5", hero ? "h-[22px] w-[22px]" : "h-4 w-4")}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* suggestions */}
      <div
        className={cx(
          "absolute left-0 right-0 z-20 origin-top transition-[opacity,transform] duration-200 ease-out",
          hero ? "top-[calc(100%+12px)]" : "top-[calc(100%+6px)]",
          showList ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        )}
      >
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="Suggested research"
          className="overflow-hidden rounded-[10px] border border-paper/25 bg-black/75 backdrop-blur-md"
        >
          {suggestions.map((s, i) => {
            const isActive = i === active;
            return (
              <li
                key={s.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit(s.text);
                }}
                onMouseEnter={() => setActive(i)}
                style={{ animationDelay: showList ? `${i * 45}ms` : undefined }}
                className={cx(
                  "flex cursor-pointer items-center gap-4 font-mono transition-colors duration-100",
                  hero ? "px-5 py-3 text-[13px] md:px-6 md:py-[11px] md:text-[15.5px]" : "px-4 py-2 text-[13px]",
                  i === 0 && "border-b border-paper/15",
                  showList && "animate-rise",
                  isActive ? "bg-paper/[0.04] text-signal" : "text-paper"
                )}
              >
                <Search aria-hidden className="h-[15px] w-[15px] shrink-0 opacity-80" strokeWidth={1.6} />
                <span className="min-w-0 flex-1 leading-snug md:truncate">{s.text}</span>
                <span className={cx("hidden shrink-0 items-center gap-2 text-2xs uppercase text-mute md:flex", !isActive && "invisible")}>
                  {KIND_LABEL[s.kind]}
                  <CornerDownLeft aria-hidden className="h-3 w-3" />
                </span>
              </li>
            );
          })}
        </ul>
        {hero && (
          <p className="mt-3 hidden justify-center gap-5 font-mono text-2xs uppercase text-mute md:flex" aria-hidden>
            <span>↑↓ select</span>
            <span>tab complete</span>
            <span>↵ run</span>
            <span>{isMac ? "⌘" : "ctrl"} K focus</span>
          </p>
        )}
      </div>
    </div>
  );
}
