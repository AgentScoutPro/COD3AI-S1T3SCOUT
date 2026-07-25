import type { PageSpeedProvider, PageSpeedMetrics, ProviderResult } from "../types";
import { seededRandom, chance } from "../seeded-random";

function makeMetrics(url: string, strategy: "mobile" | "desktop", rng: () => number): PageSpeedMetrics {
  const perf = strategy === "mobile" ? 35 + Math.floor(rng() * 55) : 55 + Math.floor(rng() * 40);
  return {
    url,
    strategy,
    performanceScore: perf,
    accessibilityScore: 70 + Math.floor(rng() * 28),
    bestPracticesScore: 65 + Math.floor(rng() * 33),
    seoScore: 75 + Math.floor(rng() * 24),
    lcpMs: strategy === "mobile" ? 2200 + Math.floor(rng() * 3500) : 1200 + Math.floor(rng() * 1800),
    inpMs: strategy === "mobile" ? 150 + Math.floor(rng() * 400) : 80 + Math.floor(rng() * 200),
    cls: Math.round(rng() * 25) / 100,
    ttfbMs: 300 + Math.floor(rng() * 900),
    hasFieldData: chance(rng, 0.5),
  };
}

export class MockPageSpeedProvider implements PageSpeedProvider {
  async analyze(url: string): Promise<ProviderResult<PageSpeedMetrics[]>> {
    const rng = seededRandom(url);
    return {
      mode: "mock",
      status: "ok",
      data: [makeMetrics(url, "mobile", rng), makeMetrics(url, "desktop", rng)],
      rawMetadata: { mock: true },
    };
  }
}
