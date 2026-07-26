import { describe, expect, it } from "vitest";
import { checkProviderIntegrity, isScoreable } from "@/lib/audit/provider-integrity";

describe("checkProviderIntegrity", () => {
  // Required test #1: a public_live audit cannot consume mock Places data.
  it("rejects mock Places data in a public_live audit", () => {
    const result = checkProviderIntegrity({
      auditMode: "public_live",
      sourceType: "places",
      providerMode: "mock",
      status: "ok",
      data: { placeId: "mock-1", rating: 4.9 },
    });
    expect(result.allowed).toBe(false);
    expect(result.data).toBeNull();
    expect(result.displayStatus).toBe("unavailable");
    expect(result.warning).toMatch(/mock provider result rejected/i);
  });

  // Required test #2: a public_live audit cannot consume mock PageSpeed data.
  it("rejects mock PageSpeed data in a public_live audit", () => {
    const result = checkProviderIntegrity({
      auditMode: "public_live",
      sourceType: "pagespeed",
      providerMode: "mock",
      status: "ok",
      data: [{ performanceScore: 90 }],
    });
    expect(result.allowed).toBe(false);
    expect(result.data).toBeNull();
    expect(result.displayStatus).toBe("unavailable");
  });

  it("rejects mock website crawl data in a connected_client audit too", () => {
    const result = checkProviderIntegrity({
      auditMode: "connected_client",
      sourceType: "website",
      providerMode: "mock",
      status: "ok",
      data: { pages: [] },
    });
    expect(result.allowed).toBe(false);
  });

  // Required test #3: demo audits still work and are clearly labeled synthetic.
  it("allows mock data in demo mode and labels it demo_synthetic", () => {
    const result = checkProviderIntegrity({
      auditMode: "demo",
      sourceType: "places",
      providerMode: "mock",
      status: "ok",
      data: { placeId: "mock-1" },
    });
    expect(result.allowed).toBe(true);
    expect(result.displayStatus).toBe("demo_synthetic");
    expect(result.warning).toBeNull();
  });

  it("allows mock data in internal_test mode and still labels it demo_synthetic, not live", () => {
    const result = checkProviderIntegrity({
      auditMode: "internal_test",
      sourceType: "pagespeed",
      providerMode: "mock",
      status: "ok",
      data: [],
    });
    expect(result.allowed).toBe(true);
    expect(result.displayStatus).toBe("demo_synthetic");
  });

  // Required test #4: missing credentials (surfaced as an "error" status
  // from a live provider) return unavailable data.
  it("treats a live provider error as unavailable, not a violation", () => {
    const result = checkProviderIntegrity({
      auditMode: "public_live",
      sourceType: "pagespeed",
      providerMode: "live",
      status: "error",
      data: [],
    });
    expect(result.allowed).toBe(false);
    expect(result.displayStatus).toBe("unavailable");
    expect(result.warning).toBeNull(); // expected unavailability, not an integrity violation worth flagging
  });

  it("allows a live 'partial' result through — still real, just incomplete", () => {
    const result = checkProviderIntegrity({
      auditMode: "public_live",
      sourceType: "places",
      providerMode: "live",
      status: "partial",
      data: null,
    });
    expect(result.allowed).toBe(true);
    expect(result.displayStatus).toBe("live");
  });

  it("labels a connected_client live result as 'connected', not 'live'", () => {
    const result = checkProviderIntegrity({
      auditMode: "connected_client",
      sourceType: "places",
      providerMode: "live",
      status: "ok",
      data: { placeId: "real-1" },
    });
    expect(result.displayStatus).toBe("connected");
  });

  it("allows a genuine live success in public_live mode", () => {
    const result = checkProviderIntegrity({
      auditMode: "public_live",
      sourceType: "places",
      providerMode: "live",
      status: "ok",
      data: { placeId: "real-1" },
    });
    expect(result.allowed).toBe(true);
    expect(result.displayStatus).toBe("live");
    expect(result.warning).toBeNull();
  });
});

describe("isScoreable", () => {
  it("treats live/connected/demo_synthetic as scoreable and unavailable/not_evaluated as not", () => {
    expect(isScoreable("live")).toBe(true);
    expect(isScoreable("connected")).toBe(true);
    expect(isScoreable("demo_synthetic")).toBe(true);
    expect(isScoreable("unavailable")).toBe(false);
    expect(isScoreable("not_evaluated")).toBe(false);
  });
});
