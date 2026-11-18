import { describe, expect, it } from "vitest";

import {
  addPhotoSchema,
  buildPhotoPath,
  isPhotoContentType,
  parsePhotoPath,
  preparePhotoSchema,
} from "./photos";

const ORG = "11111111-1111-4111-8111-111111111111";
const HOME = "22222222-2222-4222-8222-222222222222";
const FILE = "33333333-3333-4333-8333-333333333333";

describe("photo paths", () => {
  it("builds and parses a path", () => {
    const path = buildPhotoPath(ORG, HOME, FILE, "image/jpeg");
    expect(path).toBe(`${ORG}/${HOME}/${FILE}.jpg`);
    expect(parsePhotoPath(path)).toEqual({
      organisationId: ORG,
      propertyId: HOME,
      fileId: FILE,
      extension: "jpg",
    });
  });

  it("uses the right extension for each type", () => {
    expect(buildPhotoPath(ORG, HOME, FILE, "image/png")).toMatch(/\.png$/);
    expect(buildPhotoPath(ORG, HOME, FILE, "image/webp")).toMatch(/\.webp$/);
  });

  it.each([
    "",
    `${ORG}/${HOME}/${FILE}.gif`,
    `${ORG}/${HOME}/${FILE}.svg`,
    `${ORG}/${HOME}/../${FILE}.jpg`,
    `${ORG}/${FILE}.jpg`,
    `/${ORG}/${HOME}/${FILE}.jpg`,
    `${ORG}/${HOME}/${FILE}.jpg/extra`,
    `not-a-uuid/${HOME}/${FILE}.jpg`,
  ])("rejects %j", (path) => {
    expect(parsePhotoPath(path)).toBeNull();
    expect(addPhotoSchema.safeParse({ homeId: HOME, path }).success).toBe(
      false,
    );
  });
});

describe("photo types", () => {
  it("accepts JPG, PNG and WebP only", () => {
    expect(isPhotoContentType("image/jpeg")).toBe(true);
    expect(isPhotoContentType("image/png")).toBe(true);
    expect(isPhotoContentType("image/webp")).toBe(true);
    expect(isPhotoContentType("image/svg+xml")).toBe(false);
    expect(isPhotoContentType("image/gif")).toBe(false);
    expect(isPhotoContentType("toString")).toBe(false);
  });

  it("checks the home id and type before an upload", () => {
    expect(
      preparePhotoSchema.safeParse({ homeId: HOME, contentType: "image/png" })
        .success,
    ).toBe(true);
    expect(
      preparePhotoSchema.safeParse({ homeId: "x", contentType: "image/png" })
        .success,
    ).toBe(false);
    expect(
      preparePhotoSchema.safeParse({ homeId: HOME, contentType: "text/html" })
        .success,
    ).toBe(false);
  });
});
