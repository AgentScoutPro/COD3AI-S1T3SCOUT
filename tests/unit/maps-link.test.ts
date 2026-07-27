import { describe, expect, it, vi } from "vitest";
import { parseMapsUrl, resolveMapsLink } from "@/lib/providers/places/maps-link";

describe("parseMapsUrl", () => {
  it("parses name and pin coordinates from a full place URL", () => {
    const url =
      "https://www.google.com/maps/place/Kiwi+Coatings/@32.9481,-111.5218,17z/data=!3m1!4b1!4m6!3m5!1s0x1234:0xabcd!8m2!3d32.9481!4d-111.5218!16s%2Fg%2F11abcde";
    expect(parseMapsUrl(url)).toEqual({ name: "Kiwi Coatings", lat: 32.9481, lng: -111.5218 });
  });

  it("falls back to @lat,lng when no !3d/!4d pair is present", () => {
    const url = "https://www.google.com/maps/place/Kiwi+Coatings/@32.9481,-111.5218,17z";
    expect(parseMapsUrl(url)).toEqual({ name: "Kiwi Coatings", lat: 32.9481, lng: -111.5218 });
  });

  it("returns coordinates with a null name when the place segment is missing", () => {
    const url = "https://www.google.com/maps/@32.9481,-111.5218,17z";
    expect(parseMapsUrl(url)).toEqual({ name: null, lat: 32.9481, lng: -111.5218 });
  });

  it("returns null for a non-Google host", () => {
    expect(parseMapsUrl("https://example.com/maps/place/Somewhere/@32.9,-111.5,17z")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(parseMapsUrl("not a url at all")).toBeNull();
  });

  it("returns null when no coordinates can be found", () => {
    expect(parseMapsUrl("https://www.google.com/maps/place/Kiwi+Coatings/")).toBeNull();
  });
});

describe("resolveMapsLink", () => {
  // Required scenario: a real short link redirecting to a place URL (mocked fetch).
  it("follows a maps.app.goo.gl short link redirect and parses the destination", async () => {
    const destination =
      "https://www.google.com/maps/place/Kiwi+Coatings/@32.9481,-111.5218,17z/data=!3m1!4b1!4m6!3m5!1sx!8m2!3d32.9481!4d-111.5218";
    const mockFetch = vi.fn().mockResolvedValue({ url: destination } as Response);

    const result = await resolveMapsLink("https://maps.app.goo.gl/AbC123", mockFetch);

    expect(result).toEqual({ name: "Kiwi Coatings", lat: 32.9481, lng: -111.5218 });
    expect(mockFetch).toHaveBeenCalledWith("https://maps.app.goo.gl/AbC123", { method: "GET", redirect: "follow" });
  });

  it("does not follow a redirect for a full google.com/maps URL (no fetch needed)", async () => {
    const mockFetch = vi.fn();
    const url = "https://www.google.com/maps/place/Kiwi+Coatings/@32.9481,-111.5218,17z";

    const result = await resolveMapsLink(url, mockFetch);

    expect(result).toEqual({ name: "Kiwi Coatings", lat: 32.9481, lng: -111.5218 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Required scenario: malformed/non-Maps URL falls back gracefully (null, no throw).
  it("resolves to null for a malformed URL instead of throwing", async () => {
    await expect(resolveMapsLink("definitely not a url", vi.fn())).resolves.toBeNull();
  });

  it("resolves to null for a non-Maps URL instead of throwing", async () => {
    await expect(resolveMapsLink("https://example.com/somewhere", vi.fn())).resolves.toBeNull();
  });

  it("resolves to null when the short-link redirect fails, rather than throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));
    await expect(resolveMapsLink("https://maps.app.goo.gl/broken", mockFetch)).resolves.toBeNull();
  });

  it("resolves to null when the redirect destination has no coordinates", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ url: "https://www.google.com/maps/place/Kiwi+Coatings/" } as Response);
    await expect(resolveMapsLink("https://maps.app.goo.gl/AbC123", mockFetch)).resolves.toBeNull();
  });
});
