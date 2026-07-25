/** Normalizes a hostname for domain comparisons: lowercase, strip leading www. */
export function normalizeDomain(input: string): string {
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname;
  } catch {
    host = input;
  }
  return host.toLowerCase().replace(/^www\./, "");
}

/** Normalizes a URL for dedup: lowercase host, strip default port, drop
 * fragment, drop trailing slash (except root), drop tracking params. */
export function normalizeUrl(input: string, base?: string): string {
  const url = base ? new URL(input, base) : new URL(input);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }

  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  for (const param of trackingParams) url.searchParams.delete(param);
  const sortedParams = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [key, value] of sortedParams) url.searchParams.append(key, value);

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  url.pathname = pathname || "/";

  return url.toString();
}

/** Normalizes a business name for competitor de-duplication:
 * lowercase, strip punctuation, collapse whitespace, drop common suffixes. */
export function normalizeBusinessName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,'"()]/g, "")
    .replace(/\b(llc|inc|co|corp|ltd)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalizes a phone number to digits only, dropping a leading US country code. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits || null;
}
