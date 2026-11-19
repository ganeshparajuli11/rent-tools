/**
 * Photos on the landing page. All are free to use under the Unsplash
 * License (https://unsplash.com/license) and are served from Unsplash's
 * image CDN, which resizes them on the fly. To add or swap one, change the
 * photo id here; img-src in src/lib/security-headers.ts already allows the
 * CDN.
 */

const UNSPLASH = "https://images.unsplash.com";

export type LandingImage = { id: string; alt: string };

export const IMAGES = {
  sky: { id: "photo-1597571063304-81f081944ee8", alt: "" },
  building: {
    id: "photo-1722421492323-eaf9c401befe",
    alt: "A modern block of flats with balconies",
  },
  street: {
    id: "photo-1774156720905-11b4f15b284d",
    alt: "A row of red-brick terraced houses on a British street",
  },
  mews: {
    id: "photo-1510265236892-329bfd7de7a1",
    alt: "A quiet cobbled mews lined with white houses",
  },
  keys: {
    id: "photo-1759428679273-11d914866394",
    alt: "A hand holding house keys over model houses",
  },
  bedroom: {
    id: "photo-1616594039964-ae9021a400a0",
    alt: "A calm, modern bedroom",
  },
  living: {
    id: "photo-1583847268964-b28dc8f51f92",
    alt: "A bright living room with a large window",
  },
  kitchen: {
    id: "photo-1600489000022-c2086d79f9d4",
    alt: "A clean modern kitchen",
  },
  plumber: {
    id: "photo-1676210134188-4c05dd172f89",
    alt: "A tradesperson fixing a pipe",
  },
  desk: {
    id: "photo-1758974643303-df01b895e6a7",
    alt: "A sunny desk with a laptop",
  },
  aerial: {
    id: "photo-1496782850948-d8e6bbe11a9f",
    alt: "Houses seen from above",
  },
  colourful: {
    id: "photo-1573912281387-729b138c0db7",
    alt: "Colourful houses under a cloudy sky",
  },
} satisfies Record<string, LandingImage>;

/** A sized, compressed Unsplash link (WebP or AVIF where the browser can). */
export function photoUrl(image: LandingImage, width: number, quality = 72) {
  return `${UNSPLASH}/${image.id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

/** srcSet for responsive <img> tags. */
export function photoSrcSet(
  image: LandingImage,
  widths: number[] = [640, 960, 1280, 1920],
) {
  return widths.map((w) => `${photoUrl(image, w)} ${w}w`).join(", ");
}
