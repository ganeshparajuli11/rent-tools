"use client";

import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  DownloadIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { IMAGES, type LandingImage, photoSrcSet, photoUrl } from "./images";
import { Reveal, ScrollText, useInView, useScrollProgress } from "./motion";

const ramp = (start: number, length: number) =>
  `clamp(0, calc((var(--p) - ${start}) / ${length}), 1)`;

function Photo({
  image,
  sizes,
  className,
  style,
  priority = false,
}: {
  image: LandingImage;
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}) {
  return (
    // Unsplash's CDN resizes and compresses these, so next/image is not
    // needed (and would send every picture through our server).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl(image, 1280)}
      srcSet={photoSrcSet(image)}
      sizes={sizes}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
    />
  );
}

function Eyebrow({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "block text-sm font-semibold tracking-wide",
        dark ? "text-white" : "text-neutral-950",
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Why PropDesk: a paragraph that lights up as you read, then a wide photo
// that grows to fill the page.
// ---------------------------------------------------------------------------
export function WhySection() {
  const imageRef = useScrollProgress<HTMLDivElement>("pass");
  return (
    <section
      id="why"
      aria-labelledby="why-heading"
      className="mx-auto w-full max-w-7xl px-6 pt-24 pb-16 sm:pt-32 lg:px-10"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <h2 id="why-heading">
          <Eyebrow>Why PropDesk</Eyebrow>
        </h2>
        <ScrollText
          className="text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.12] font-semibold tracking-[-0.03em] text-neutral-950"
          text="Spreadsheets, notes apps and group chats were never built to run homes. PropDesk keeps every property, tenant, payment and repair in one tidy record, so nothing slips and nobody has to ask twice."
        />
      </div>

      <div
        ref={imageRef}
        className="mt-20 overflow-hidden"
        style={{
          transform: `scale(calc(0.82 + ${ramp(0.05, 0.4)} * 0.18))`,
          borderRadius: `calc((1 - ${ramp(0.05, 0.4)}) * 3rem + 1rem)`,
        }}
      >
        <Photo
          image={IMAGES.street}
          sizes="(min-width: 1280px) 1200px, 100vw"
          className="aspect-[16/9] w-full object-cover"
          style={{
            transform: `scale(1.15) translateY(calc((var(--p) - 0.5) * -8%))`,
          }}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// "Not just rent": four chevron-shaped photos that slide in one by one.
// ---------------------------------------------------------------------------
const CHEVRON = "polygon(0% 0%, 68% 0%, 100% 50%, 68% 100%, 0% 100%, 32% 50%)";

const STRIP: LandingImage[] = [
  IMAGES.keys,
  IMAGES.bedroom,
  IMAGES.plumber,
  IMAGES.desk,
];

export function JourneySection() {
  const ref = useScrollProgress<HTMLDivElement>("enter", { ease: 0.1 });
  return (
    <section
      aria-labelledby="journey-heading"
      className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 py-24 text-center lg:px-10"
    >
      <ScrollText
        as="h2"
        id="journey-heading"
        className="max-w-4xl text-[clamp(2.25rem,5.5vw,4.75rem)] leading-[1] font-semibold tracking-[-0.045em] text-neutral-950"
        text="It's not just rent tracking."
      />

      <div
        ref={ref}
        aria-hidden="true"
        className="mt-14 grid w-full max-w-5xl grid-cols-4 gap-1 sm:gap-3"
      >
        {STRIP.map((image, i) => (
          <div
            key={image.id}
            className="aspect-[4/5]"
            style={{
              clipPath: CHEVRON,
              opacity: `calc(0.12 + ${ramp(0.1 + i * 0.13, 0.25)} * 0.88)`,
              transform: `translateX(calc((1 - ${ramp(0.1 + i * 0.13, 0.3)}) * -40px))`,
            }}
          >
            <Photo
              image={image}
              sizes="25vw"
              className="size-full object-cover"
            />
          </div>
        ))}
      </div>

      <ScrollText
        className="mt-14 max-w-2xl text-xl leading-snug font-medium text-neutral-950 sm:text-2xl"
        text="It's handing over keys, filling empty rooms, getting the boiler fixed and paying the owner on time. PropDesk keeps the whole story of every home."
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features: a dark section of big words that rise into view.
// ---------------------------------------------------------------------------
const FEATURES: {
  word: string;
  title: string;
  body: string;
  image: LandingImage;
}[] = [
  {
    word: "Homes",
    title: "Every property, properly recorded",
    body: "Addresses, rooms, photos, status and notes. Archive a home when you stop letting it, and keep its history.",
    image: IMAGES.mews,
  },
  {
    word: "Owners",
    title: "Owners and what you owe them",
    body: "Landlord or letting manager, keep owner contacts, which homes they own and the rent you pay them.",
    image: IMAGES.living,
  },
  {
    word: "Tenants",
    title: "Tenants and tenancies, past and present",
    body: "Move-in dates, rent, due day and deposit. When someone moves out, their history stays.",
    image: IMAGES.bedroom,
  },
  {
    word: "Rent",
    title: "Know who has paid, in seconds",
    body: "Each month's rent is ready to tick off. Record full or part payments, and see who is late at a glance.",
    image: IMAGES.keys,
  },
  {
    word: "Repairs",
    title: "Repairs from report to resolved",
    body: "Log an issue, set its priority, assign a contractor and follow it through to done.",
    image: IMAGES.plumber,
  },
  {
    word: "Reports",
    title: "The numbers, without the maths",
    body: "Rent in, rent out to owners, what is left, and open jobs. Export your records any time.",
    image: IMAGES.desk,
  },
];

function FeatureRow({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const [ref, shown] = useInView<HTMLLIElement>("0px 0px -20% 0px");
  return (
    <li
      ref={ref}
      className="group grid gap-6 border-t border-white/15 py-10 lg:grid-cols-[3rem_minmax(0,22rem)_1fr_auto] lg:items-center lg:gap-10"
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-white/40 text-sm text-white">
        {index + 1}
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
        <p className="text-base leading-relaxed text-white/70">
          {feature.body}
        </p>
      </div>
      <div className="overflow-hidden" aria-hidden="true">
        <span
          className={cn(
            "block text-[clamp(3.5rem,11vw,10rem)] leading-[0.9] font-medium tracking-[-0.05em] text-white transition-transform duration-1000 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:translate-y-0",
            shown ? "translate-y-0" : "translate-y-full",
          )}
        >
          {feature.word}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="hidden overflow-hidden rounded-2xl lg:block lg:h-32 lg:w-44"
      >
        <Photo
          image={feature.image}
          sizes="176px"
          className="size-full scale-110 object-cover opacity-70 grayscale transition duration-700 group-hover:scale-100 group-hover:opacity-100 group-hover:grayscale-0"
        />
      </div>
    </li>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-16 bg-neutral-950 text-white"
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:px-10">
        <div className="grid gap-8 pb-16 lg:grid-cols-2">
          <Eyebrow dark>What it does</Eyebrow>
          <ScrollText
            as="h2"
            id="features-heading"
            className="text-[clamp(2.25rem,5vw,4.5rem)] leading-[1] font-semibold tracking-[-0.045em]"
            text="Everything a small letting business runs on."
          />
        </div>
        <ol>
          {FEATURES.map((feature, index) => (
            <FeatureRow key={feature.word} feature={feature} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Product preview: an app window that tilts up into place as you scroll.
// All figures are made-up demo data.
// ---------------------------------------------------------------------------
const DEMO_ROWS = [
  {
    home: "Sample House 01",
    tenant: "Taylor Example",
    amount: "£575",
    status: "Paid",
  },
  {
    home: "Sample House 01",
    tenant: "Jordan Sample",
    amount: "£525",
    status: "Late",
  },
  {
    home: "Demo Court, Flat 3",
    tenant: "Alex Placeholder",
    amount: "£1,150",
    status: "Paid",
  },
  {
    home: "Test Villa",
    tenant: "Sam Fictional",
    amount: "£560",
    status: "Due",
  },
];

const STATUS_STYLE: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-800",
  Late: "bg-red-100 text-red-700",
  Due: "bg-amber-100 text-amber-800",
};

export function PreviewSection() {
  const ref = useScrollProgress<HTMLDivElement>("pass");
  return (
    <section
      aria-labelledby="preview-heading"
      className="overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-white pb-24"
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <h2 id="preview-heading" className="sr-only">
          A look inside PropDesk
        </h2>
        <div
          ref={ref}
          className="[perspective:1600px]"
          aria-label="A preview of the PropDesk dashboard with demo data"
          role="img"
        >
          <div
            className="overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgb(0_0_0/0.6)] ring-1 ring-black/10"
            style={{
              transform: `rotateX(calc((1 - ${ramp(0.05, 0.4)}) * 28deg)) scale(calc(0.88 + ${ramp(0.05, 0.4)} * 0.12)) translateY(calc((1 - ${ramp(0.05, 0.4)}) * 40px))`,
              transformOrigin: "50% 100%",
            }}
          >
            {/* Window bar */}
            <div className="flex items-center gap-2 border-b bg-neutral-50 px-4 py-3">
              <span className="size-3 rounded-full bg-red-400" />
              <span className="size-3 rounded-full bg-amber-400" />
              <span className="size-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-neutral-500">
                propdesk · Dashboard · demo data
              </span>
            </div>
            <div className="grid sm:grid-cols-[12rem_1fr]">
              <div className="hidden flex-col gap-1 border-r bg-neutral-50 p-4 text-sm text-neutral-600 sm:flex">
                {[
                  "Dashboard",
                  "Properties",
                  "Owners",
                  "Tenants",
                  "Rent",
                  "Repairs",
                  "Reports",
                ].map((item, i) => (
                  <span
                    key={item}
                    className={cn(
                      "rounded-lg px-3 py-2",
                      i === 0 &&
                        "bg-white font-medium text-neutral-950 shadow-sm",
                    )}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-5 p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-neutral-950">
                    Good morning
                  </span>
                  <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white">
                    + New
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ["Rent expected", "£4,120"],
                    ["Received", "£3,545"],
                    ["Late", "1 tenant"],
                    ["Open repairs", "3"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border p-3">
                      <p className="text-xs text-neutral-500">{label}</p>
                      <p className="mt-1 text-xl font-semibold text-neutral-950 tabular-nums">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-xl border">
                  {DEMO_ROWS.map((row) => (
                    <div
                      key={row.tenant}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_1fr_auto_auto]"
                    >
                      <span className="font-medium text-neutral-950">
                        {row.tenant}
                      </span>
                      <span className="hidden text-neutral-500 sm:block">
                        {row.home}
                      </span>
                      <span className="hidden tabular-nums sm:block">
                        {row.amount}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLE[row.status],
                        )}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works: a sticky heading beside three steps.
// ---------------------------------------------------------------------------
const STEPS = [
  [
    "Add your homes.",
    "Type them in or bring them from a spreadsheet. Rooms, owners and photos included.",
  ],
  [
    "Add your tenants.",
    "Their rent and due day set up the months ahead automatically.",
  ],
  [
    "Tick off the month.",
    "Mark rent as paid, log repairs, and see what needs you first every morning.",
  ],
] as const;

export function StepsSection() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="mx-auto grid w-full max-w-7xl scroll-mt-16 gap-12 px-6 py-24 sm:py-32 lg:grid-cols-2 lg:px-10"
    >
      <div className="lg:sticky lg:top-28 lg:self-start">
        <ScrollText
          as="h2"
          id="how-heading"
          className="text-[clamp(2.25rem,5vw,4.5rem)] leading-[1] font-semibold tracking-[-0.045em] text-neutral-950"
          text="Set up in an afternoon."
        />
        <Link
          href="/sign-in"
          className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-neutral-950 px-6 text-base font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Start now
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
      <div>
        <p className="text-lg font-semibold text-neutral-950">Steps:</p>
        <ol className="mt-6 border-b">
          {STEPS.map(([title, body], i) => (
            <li
              key={title}
              className="grid grid-cols-[3rem_1fr] items-baseline gap-2 border-t py-8"
            >
              <span className="text-sm text-neutral-500 tabular-nums">
                0{i + 1}
              </span>
              <ScrollText
                className="text-[clamp(1.4rem,2.4vw,2.1rem)] leading-tight font-semibold tracking-[-0.03em] text-neutral-950"
                text={`${title} ${body}`}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Who it is for: two photo cards.
// ---------------------------------------------------------------------------
const AUDIENCES = [
  {
    title: "Landlords",
    body: "Your own homes, your own tenants. Know what came in and what is late without opening a spreadsheet.",
    image: IMAGES.colourful,
  },
  {
    title: "Letting managers",
    body: "Homes you manage or rent to rent for several owners, each owner's rent kept straight.",
    image: IMAGES.aerial,
  },
];

export function AudienceSection() {
  return (
    <section
      aria-labelledby="audience-heading"
      className="bg-neutral-100 py-24 sm:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="grid gap-8 pb-14 lg:grid-cols-2">
          <Eyebrow>Who it&apos;s for</Eyebrow>
          <ScrollText
            as="h2"
            id="audience-heading"
            className="text-[clamp(2.25rem,5vw,4.5rem)] leading-[1] font-semibold tracking-[-0.045em] text-neutral-950"
            text="Small teams. Real homes."
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {AUDIENCES.map((audience, i) => (
            <Reveal key={audience.title} delay={i * 120}>
              <article className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl p-8 text-white sm:aspect-[5/6]">
                <Photo
                  image={audience.image}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                />
                <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {audience.title}
                </h3>
                <p className="mt-3 max-w-md text-lg text-white/85">
                  {audience.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust: plain statements of how data is handled. No claims of legal
// compliance (see the product spec).
// ---------------------------------------------------------------------------
const TRUST = [
  {
    icon: ShieldCheckIcon,
    title: "Your records stay yours",
    body: "Each business's data is kept apart by the database itself, not just hidden on screen.",
  },
  {
    icon: LockIcon,
    title: "Private by default",
    body: "Secure sign-in, encrypted connections and every change recorded in a history.",
  },
  {
    icon: DownloadIcon,
    title: "Leave whenever you like",
    body: "Download your homes, tenants and payments as a spreadsheet at any time.",
  },
];

export function TrustSection() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-10"
    >
      <h2 id="trust-heading" className="sr-only">
        How we look after your data
      </h2>
      <div className="grid gap-10 md:grid-cols-3">
        {TRUST.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 100} className="flex flex-col gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <h3 className="text-xl font-semibold text-neutral-950">{title}</h3>
            <p className="text-base leading-relaxed text-neutral-600">{body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Closing call to action: the name filled with a photo that pans as you
// scroll.
// ---------------------------------------------------------------------------
export function ClosingSection() {
  const ref = useScrollProgress<HTMLElement>("pass");
  return (
    <section
      ref={ref}
      aria-labelledby="closing-heading"
      className="relative overflow-hidden px-6 pt-16 pb-28 text-center"
    >
      <h2 id="closing-heading" className="sr-only">
        Bring your homes to PropDesk
      </h2>
      <p
        aria-hidden="true"
        className="pd-photo-text mx-auto text-[clamp(4.5rem,20vw,19rem)] leading-[0.85] font-bold tracking-[-0.06em]"
        style={{
          backgroundImage: `url("${photoUrl(IMAGES.aerial, 1600, 70)}")`,
          backgroundSize: "140% auto",
          backgroundPosition: `50% calc(var(--p) * 100%)`,
        }}
      >
        PropDesk
      </p>
      <ScrollText
        className="mx-auto mt-8 max-w-2xl text-[clamp(1.5rem,3vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em] text-neutral-950"
        text="Bring your homes in. We'll keep them in order."
      />
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/sign-in"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-neutral-950 px-6 text-base font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Get started
          <ArrowUpRightIcon
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
