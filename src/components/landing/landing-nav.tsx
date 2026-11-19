"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

const LINKS = [
  { href: "#why", label: "Why PropDesk" },
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
];

/** Fired after jumping back to the top, so the hero replays its intro. */
export const REPLAY_EVENT = "propdesk:replay-intro";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Back to the very top, as if the page had just loaded. */
function restartPage() {
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  window.scrollTo({ top: 0, behavior: "instant" });
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

/** Smooth scroll to a section without leaving a #hash in the address. */
function scrollToSection(event: React.MouseEvent, href: string) {
  const target = document.querySelector(href);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

/**
 * Top bar. See-through over the sky, then frosted white once the page has
 * scrolled. On phones the links fold into a menu.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // The landing page is a film: always start it from the beginning. Stop
  // the browser restoring the old scroll position (or a #section) on
  // reload, and put the default back when leaving the page.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    // Also set before unload, so a reload never jumps down first.
    const onLeave = () => {
      window.history.scrollRestoration = "manual";
    };
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    // Check once after the first paint (the page may load half-scrolled).
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500",
        scrolled || open
          ? "bg-white/85 shadow-[0_1px_0_rgb(0_0_0/0.06)] backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-6 lg:px-10"
      >
        <Link
          href="/"
          aria-label="PropDesk home"
          onClick={(event) => {
            // Already on the landing page: Next.js would do nothing, so
            // jump to the top and replay the intro instead.
            if (window.location.pathname === "/") {
              event.preventDefault();
              setOpen(false);
              restartPage();
            }
          }}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-neutral-950"
        >
          <BrandMark />
          PropDesk
        </Link>

        <ul className="hidden items-center gap-8 text-sm font-medium text-neutral-800 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(event) => scrollToSection(event, link.href)}
                className="transition-colors hover:text-neutral-950"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Sign in
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-neutral-950 md:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <XIcon aria-hidden="true" className="size-5" />
            ) : (
              <MenuIcon aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </nav>

      {open ? (
        <ul
          id="landing-menu"
          className="flex flex-col gap-1 border-t px-6 pt-2 pb-6 md:hidden"
        >
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(event) => {
                  setOpen(false);
                  scrollToSection(event, link.href);
                }}
                className="flex min-h-12 items-center text-lg font-medium text-neutral-950"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
