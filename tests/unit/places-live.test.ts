import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// LiveGooglePlacesProvider reads env.googleMapsApiKey once at module-load
// time (src/lib/env.ts), so the API key must be set BEFORE that module
// first evaluates. Static imports are hoisted above any top-level code in
// this file, which would run too late — so each test dynamically imports
// the provider fresh, after setting process.env and resetting the module
// registry.
const ORIGINAL_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function loadProvider() {
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
  vi.resetModules();
  const mod = await import("@/lib/providers/places/live");
  return new mod.LiveGooglePlacesProvider();
}

function rawPlace(overrides: { id: string; name: string; website?: string | null }) {
  return {
    id: overrides.id,
    displayName: { text: overrides.name },
    formattedAddress: "123 Main St, Queen Creek, AZ 85142",
    websiteUri: overrides.website ?? undefined,
    businessStatus: "OPERATIONAL",
  };
}

function jsonResponse(places: unknown[]) {
  return { ok: true, json: async () => ({ places }) } as Response;
}

const input = {
  name: "JM Electrical",
  city: "Queen Creek",
  state: "AZ",
  websiteUrl: "https://jmelectricalaz.com",
};

describe("LiveGooglePlacesProvider.findBusiness", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = ORIGINAL_KEY;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("matches on an exact name+city+state query", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([rawPlace({ id: "p1", name: "JM Electrical" })]));
    vi.stubGlobal("fetch", fetchMock);

    const provider = await loadProvider();
    const result = await provider.findBusiness(input);

    expect(result.status).toBe("ok");
    expect(result.data?.placeId).toBe("p1");
    expect(result.rawMetadata?.queryPath).toBe("strict");
    expect(result.rawMetadata?.matchMethod).toBe("name");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.textQuery).toBe("JM Electrical, Queen Creek, AZ");
    expect(body.maxResultCount).toBe(5);
  });

  it("prefers a website-domain match over a stronger-looking name in the same batch", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        // Same/similar name, no website — should lose to the domain match below.
        rawPlace({ id: "wrong", name: "JM Electrical Services" }),
        rawPlace({ id: "right", name: "JME Electric LLC", website: "https://jmelectricalaz.com/" }),
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = await loadProvider();
    const result = await provider.findBusiness(input);

    expect(result.status).toBe("ok");
    expect(result.data?.placeId).toBe("right");
    expect(result.rawMetadata?.matchMethod).toBe("website");
    expect(result.rawMetadata?.queryPath).toBe("strict");
  });

  it("falls back to a broader name+state query when the strict query returns zero results", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([])) // strict: name+city+state — the JM Electrical incident
      .mockResolvedValueOnce(jsonResponse([rawPlace({ id: "found-broad", name: "JM Electrical" })]));
    vi.stubGlobal("fetch", fetchMock);

    const provider = await loadProvider();
    const result = await provider.findBusiness(input);

    expect(result.status).toBe("ok");
    expect(result.data?.placeId).toBe("found-broad");
    expect(result.rawMetadata?.queryPath).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody.textQuery).toBe("JM Electrical, AZ");
    expect(secondBody.textQuery).not.toContain("Queen Creek");
  });

  it("falls back when the strict query returns candidates but none clear the confidence floor", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([rawPlace({ id: "unrelated", name: "Totally Different Plumbing Co" })]))
      .mockResolvedValueOnce(jsonResponse([rawPlace({ id: "found-broad", name: "JM Electrical" })]));
    vi.stubGlobal("fetch", fetchMock);

    const provider = await loadProvider();
    const result = await provider.findBusiness(input);

    expect(result.data?.placeId).toBe("found-broad");
    expect(result.rawMetadata?.queryPath).toBe("fallback");
  });

  // Required scenario: genuine no-match (fallback also empty).
  it("returns a genuine no-match when both the strict and fallback queries come back empty", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const provider = await loadProvider();
    const result = await provider.findBusiness(input);

    expect(result.status).toBe("partial");
    expect(result.data).toBeNull();
    expect(result.rawMetadata?.matchMethod).toBe("none");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a genuine no-match when candidates exist in both queries but none clear the floor", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([rawPlace({ id: "a", name: "Totally Different Plumbing Co" })]))
      .mockResolvedValueOnce(jsonResponse([rawPlace({ id: "b", name: "Also Unrelated Roofing" })]));
    vi.stubGlobal("fetch", fetchMock);

    const provider = await loadProvider();
    const result = await provider.findBusiness(input);

    expect(result.status).toBe("partial");
    expect(result.data).toBeNull();
    expect(result.rawMetadata?.matchMethod).toBe("none");
  });

  it("returns an error result when the Places API request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const provider = await loadProvider();
    const result = await provider.findBusiness(input);

    expect(result.status).toBe("error");
    expect(result.data).toBeNull();
  });
});
