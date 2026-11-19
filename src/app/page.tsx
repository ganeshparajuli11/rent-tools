import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/landing/brand-mark";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/landing-nav";
import {
  AudienceSection,
  ClosingSection,
  FeaturesSection,
  JourneySection,
  PreviewSection,
  StepsSection,
  TrustSection,
  WhySection,
} from "@/components/landing/sections";

export const metadata: Metadata = {
  title: { absolute: "PropDesk | Property management for UK landlords" },
  description:
    "Homes, owners, tenants, rent and repairs in one calm place, for UK landlords and letting managers.",
};

/** The public landing page. Signed-in people can still open it. */
export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-white text-neutral-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      <LandingNav />
      <main id="main" tabIndex={-1} className="flex-1">
        <Hero />
        <WhySection />
        <JourneySection />
        <FeaturesSection />
        <PreviewSection />
        <StepsSection />
        <AudienceSection />
        <TrustSection />
        <ClosingSection />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span className="flex items-center gap-2 font-semibold text-neutral-950">
            <BrandMark className="size-6" />
            PropDesk
          </span>
          <p>
            © {new Date().getFullYear()} PropDesk. Photos from{" "}
            <a
              href="https://unsplash.com/license"
              className="underline underline-offset-4 hover:text-neutral-950"
              rel="noreferrer"
              target="_blank"
            >
              Unsplash
            </a>
            .
          </p>
          <Link
            href="/sign-in"
            className="font-medium text-neutral-950 underline-offset-4 hover:underline"
          >
            Sign in to your account
          </Link>
        </div>
      </footer>
    </div>
  );
}
