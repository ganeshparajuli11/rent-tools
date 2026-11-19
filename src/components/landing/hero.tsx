"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { IMAGES, photoSrcSet, photoUrl } from "./images";
import { LetterIn, useScrollProgress } from "./motion";

/**
 * The opening scene. The section is tall and its content sticks to the
 * screen, so scrolling plays a short film instead of moving the page:
 *
 *   0.00 - 0.25  the headline lifts, blurs and fades
 *   0.00 - 0.45  the building rises out of the clouds
 *   0.38 - 0.55  "PropDesk" appears as an outline over the building
 *   0.55 - 0.70  the building fades and the word fills with its photo
 *   0.80 - 1.00  the clouds wash everything to white
 *
 * Every step reads the scroll progress --p (0 to 1) in calc(). With reduced
 * motion the section is not pinned and shows the headline and building.
 */

/** clamp(0, (p - start) / length, 1) as a CSS expression. */
const ramp = (start: number, length: number) =>
  `clamp(0, calc((var(--p) - ${start}) / ${length}), 1)`;

/** One soft cloud made of a blurred radial gradient. */
function Cloud({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{
        background:
          "radial-gradient(closest-side, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0.6) 55%, rgb(255 255 255 / 0))",
        filter: "blur(6px)",
        ...style,
      }}
    />
  );
}

export function Hero() {
  const ref = useScrollProgress<HTMLElement>("pin", { ease: 0.12 });

  return (
    <section
      ref={ref}
      aria-labelledby="hero-heading"
      className="relative h-[340vh] motion-reduce:h-auto"
      style={{ "--p": 0 } as React.CSSProperties}
    >
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:relative">
        {/* Sky, with a warm glow low on the left. */}
        <div aria-hidden="true" className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(IMAGES.sky, 1920, 70)}
            srcSet={photoSrcSet(IMAGES.sky)}
            sizes="100vw"
            alt=""
            fetchPriority="high"
            className="size-full scale-110 object-cover"
            style={{
              transform: `translateY(calc(var(--p) * -6%)) scale(1.1)`,
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_95%,rgb(255_190_150/0.65),transparent_45%),radial-gradient(circle_at_95%_10%,rgb(255_255_255/0.35),transparent_40%)]" />
        </div>

        {/* Headline */}
        <div
          className="absolute inset-x-0 top-[17vh] z-20 flex flex-col items-center px-6 text-center motion-reduce:static motion-reduce:pt-32"
          style={{
            opacity: `calc(1 - ${ramp(0.02, 0.2)})`,
            filter: `blur(calc(${ramp(0.02, 0.22)} * 18px))`,
            transform: `translateY(calc(var(--p) * -28vh))`,
          }}
        >
          <h1
            id="hero-heading"
            className="max-w-5xl text-[clamp(2.75rem,8.5vw,7.5rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-neutral-950"
          >
            <LetterIn text="Every property." delay={150} />{" "}
            <LetterIn
              text="One calm desk."
              delay={650}
              className="text-neutral-950/55"
            />
          </h1>
          <p
            className="pd-fade-up mt-6 max-w-xl text-lg text-neutral-800 sm:text-xl"
            style={{ animationDelay: "1.2s" }}
          >
            Homes, owners, tenants, rent and repairs in one place, for UK
            landlords and letting managers who have outgrown spreadsheets.
          </p>
          <div
            className="pd-fade-up mt-8 flex flex-wrap justify-center gap-3"
            style={{ animationDelay: "1.45s" }}
          >
            <Link
              href="/sign-in"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-neutral-950 px-6 text-base font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Get started
              <ArrowRightIcon
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center rounded-full bg-white/70 px-6 text-base font-medium text-neutral-950 ring-1 ring-black/10 backdrop-blur transition-colors hover:bg-white"
            >
              See what it does
            </a>
          </div>
        </div>

        {/* The building rises from the clouds, then fades as the word fills. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-10 flex justify-center motion-reduce:static motion-reduce:mt-16"
          style={{
            transform: `translateY(calc((1 - ${ramp(0, 0.45)}) * 52vh)) scale(calc(1 + var(--p) * 0.22))`,
            transformOrigin: "50% 100%",
            opacity: `calc(1 - ${ramp(0.58, 0.14)})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(IMAGES.building, 1600, 75)}
            srcSet={photoSrcSet(IMAGES.building, [640, 1024, 1600, 2200])}
            sizes="(min-width: 1024px) 70vw, 94vw"
            alt=""
            fetchPriority="high"
            className="h-[78vh] w-[min(94vw,1100px)] rounded-t-[2.5rem] object-cover object-top shadow-[0_-30px_80px_-20px_rgb(0_0_0/0.35)]"
          />
        </div>

        {/* Big word: outline first, then filled with the building photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center motion-reduce:hidden"
          style={{
            opacity: `calc(${ramp(0.36, 0.1)} * (1 - ${ramp(0.86, 0.1)}))`,
            transform: `scale(calc(0.92 + ${ramp(0.36, 0.5)} * 0.12))`,
          }}
        >
          <div className="relative text-[clamp(4rem,19vw,17rem)] leading-none font-bold tracking-[-0.06em]">
            <span className="pd-outline-text block">PropDesk</span>
            <span
              className="pd-photo-text absolute inset-0 block"
              style={{
                backgroundImage: `url("${photoUrl(IMAGES.building, 1600, 70)}")`,
                opacity: ramp(0.55, 0.14),
              }}
            >
              PropDesk
            </span>
          </div>
          <p
            className="mt-4 text-[clamp(1rem,2.2vw,1.6rem)] font-medium tracking-tight text-neutral-900"
            style={{ opacity: ramp(0.6, 0.12) }}
          >
            Property management, made calm.
          </p>
        </div>

        {/* Clouds drifting in front of the building, rising as you scroll. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-20 h-[45vh] motion-reduce:hidden"
          style={{ transform: `translateY(calc(var(--p) * -35vh))` }}
        >
          <div className="pd-drift absolute inset-0">
            <Cloud className="-left-[10%] bottom-[-18%] h-[70%] w-[55%]" />
            <Cloud className="left-[25%] bottom-[-25%] h-[65%] w-[50%]" />
            <Cloud className="right-[-8%] bottom-[-20%] h-[75%] w-[50%]" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white/90 to-transparent" />
        </div>

        {/* The final wash to white, leading into the page below. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 bg-gradient-to-t from-white via-white/95 to-white/60 motion-reduce:hidden"
          style={{ opacity: ramp(0.82, 0.16) }}
        />

        {/* Scroll hint */}
        <div
          aria-hidden="true"
          className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 text-sm font-medium text-neutral-700 motion-reduce:hidden"
          style={{ opacity: `calc(1 - ${ramp(0, 0.06)})` }}
        >
          <span className="pd-fade-up block" style={{ animationDelay: "2s" }}>
            Scroll
          </span>
        </div>
      </div>
    </section>
  );
}
