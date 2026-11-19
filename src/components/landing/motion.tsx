"use client";

import { type ElementType, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-linked motion for the landing page, with no animation library.
 *
 * useScrollProgress writes a number from 0 to 1 to the CSS variable --p on
 * an element as the page scrolls. Styles then read it with calc() and
 * clamp(), so nothing re-renders while scrolling. The value is eased
 * towards the real scroll position each frame, which gives the soft,
 * weighted feel of a smooth-scroll site without taking over the scrollbar.
 *
 * Modes:
 *  - "pin":   a tall section with a sticky child. 0 when its top reaches the
 *             top of the screen, 1 when its bottom reaches the bottom.
 *  - "pass":  0 when the element's top enters at the bottom of the screen,
 *             1 when its bottom leaves at the top.
 *  - "enter": 0 when its top enters at the bottom, 1 when its top is 30%
 *             down the screen. Good for text that lights up as you read.
 *
 * People who ask for reduced motion get the finished state (--p: 1) and no
 * easing.
 */

type Mode = "pin" | "pass" | "enter";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function measure(el: HTMLElement, mode: Mode) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  let value: number;
  if (mode === "pin") {
    value = -rect.top / Math.max(1, rect.height - vh);
  } else if (mode === "pass") {
    value = (vh - rect.top) / (vh + rect.height);
  } else {
    value = (vh - rect.top) / (vh * 0.7);
    // Text near the very end of the page can never climb 30% up the
    // screen, so finish it once the page is scrolled to the bottom.
    const atBottom =
      window.scrollY + vh >= document.documentElement.scrollHeight - 4;
    if (atBottom && rect.top < vh) value = 1;
  }
  return Math.min(1, Math.max(0, value));
}

export function useScrollProgress<T extends HTMLElement>(
  mode: Mode,
  { ease = 0.14 }: { ease?: number } = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.style.setProperty("--p", mode === "pin" ? "0" : "1");
      return;
    }

    let current = measure(el, mode);
    let target = current;
    let frame = 0;
    el.style.setProperty("--p", current.toFixed(4));

    const tick = () => {
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.0005) current = target;
      el.style.setProperty("--p", current.toFixed(4));
      frame = current === target ? 0 : requestAnimationFrame(tick);
    };
    const onScroll = () => {
      target = measure(el, mode);
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, ease]);

  return ref;
}

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends HTMLElement>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Without IntersectionObserver (or with reduced motion) the CSS shows
    // .pd-reveal content as-is, so there is nothing to do.
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [margin]);

  return [ref, shown] as const;
}

/** Fades, lifts and un-blurs its children the first time they scroll in. */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [ref, shown] = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      data-shown={shown || undefined}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("pd-reveal", className)}
    >
      {children}
    </Tag>
  );
}

/**
 * Text that lights up word by word as it scrolls into view: words start
 * pale and turn solid in reading order. Screen readers get the plain text.
 */
export function ScrollText({
  text,
  as: Tag = "p",
  id,
  className,
}: {
  text: string;
  as?: ElementType;
  id?: string;
  className?: string;
}) {
  const ref = useScrollProgress<HTMLElement>("enter");
  const words = text.split(" ");
  const total = words.length;
  return (
    <Tag ref={ref} id={id} className={className}>
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="transition-[opacity] duration-150"
          style={{
            opacity: `clamp(0.16, calc(var(--p, 1) * ${(total * 1.25).toFixed(2)} - ${i}), 1)`,
          }}
        >
          {word}
          {i < total - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}

/**
 * A headline whose letters drift up out of a blur when the page loads,
 * one after another. Screen readers get the plain text.
 */
export function LetterIn({
  text,
  as: Tag = "span",
  className,
  delay = 0,
  step = 32,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  step?: number;
}) {
  let index = 0;
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      {text.split(" ").map((word, w, all) => (
        <span
          key={w}
          aria-hidden="true"
          className="inline-block whitespace-nowrap"
        >
          {Array.from(word).map((letter) => {
            const i = index++;
            return (
              <span
                key={i}
                className="pd-letter inline-block"
                style={{ animationDelay: `${delay + i * step}ms` }}
              >
                {letter}
              </span>
            );
          })}
          {w < all.length - 1 ? (
            <span className="inline-block">&nbsp;</span>
          ) : null}
        </span>
      ))}
    </Tag>
  );
}
