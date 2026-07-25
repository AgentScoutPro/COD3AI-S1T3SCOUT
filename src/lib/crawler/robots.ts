export interface RobotsRules {
  found: boolean;
  disallow: string[];
  allow: string[];
  sitemaps: string[];
}

const NO_RULES: RobotsRules = { found: false, disallow: [], allow: [], sitemaps: [] };

/** Minimal robots.txt parser scoped to a single user-agent match (our bot,
 * falling back to `*`). Good enough for the compliance requirement of
 * respecting Disallow/Allow directives — not a full spec implementation. */
export function parseRobotsTxt(body: string, userAgent: string): RobotsRules {
  const lines = body.split(/\r?\n/);
  const agentLc = userAgent.toLowerCase();

  let currentAgents: string[] = [];
  let matchesOurAgent = false;
  const groups: Record<string, { disallow: string[]; allow: string[] }> = {};
  const sitemaps: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      currentAgents = [value.toLowerCase()];
      matchesOurAgent = false;
    } else if (key === "disallow" || key === "allow") {
      for (const agent of currentAgents) {
        groups[agent] ??= { disallow: [], allow: [] };
        if (value) groups[agent][key].push(value);
      }
    } else if (key === "sitemap" && value) {
      sitemaps.push(value);
    }
    void matchesOurAgent;
  }

  const specific = groups[agentLc];
  const wildcard = groups["*"];
  const chosen = specific ?? wildcard ?? { disallow: [], allow: [] };

  return { found: true, disallow: chosen.disallow, allow: chosen.allow, sitemaps };
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$$/, "$");
  return new RegExp(`^${escaped}`);
}

export function isPathAllowed(rules: RobotsRules, pathname: string): boolean {
  if (!rules.found) return true;

  const matches = (patterns: string[]) => patterns.some((p) => patternToRegex(p).test(pathname));
  const disallowed = matches(rules.disallow);
  if (!disallowed) return true;

  // Most specific allow beats a matching disallow (simplified precedence).
  const allowed = matches(rules.allow);
  return allowed;
}

export async function fetchRobotsTxt(
  origin: string,
  userAgent: string,
  timeoutMs: number
): Promise<RobotsRules> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(new URL("/robots.txt", origin).toString(), {
      headers: { "User-Agent": userAgent },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return NO_RULES;
    const body = await res.text();
    return parseRobotsTxt(body, userAgent);
  } catch {
    return NO_RULES;
  }
}
