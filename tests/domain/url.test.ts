import { describe, expect, it } from "vitest";
import { normalizeUrl, slugify } from "../../src/domain/url";
import { invalidUrls, urlFixtures } from "../fixtures/urls";

describe("normalizeUrl", () => {
  it.each(urlFixtures)("normalizes $input", ({ input, expected }) => {
    expect(normalizeUrl(input)).toBe(expected);
    expect(normalizeUrl(expected)).toBe(expected);
  });

  it.each(invalidUrls)("rejects %s", (input) => {
    expect(() => normalizeUrl(input)).toThrow(/invalid_url/);
  });
});

describe("slugify", () => {
  it("builds a stable ascii slug", () => {
    expect(slugify("  Mike Solana ")).toBe("mike-solana");
  });

  it("returns null when nothing remains", () => {
    expect(slugify("...")).toBeNull();
  });
});
