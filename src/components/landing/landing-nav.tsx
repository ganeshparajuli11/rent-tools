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

/**
 * Top bar. See-through over the sky, then frosted white once the page has
 * scrolled. On phones the links fold into a menu.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
          ? "bg-white/80 shadow-[0_1px_0_rgb(0_0_0/0.06)] backdrop-blur-xl"
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
                onClick={() => setOpen(false)}
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
