const TRACKING_KEYS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "igshid"]);

/**
 * Canonical article and post identity.
 * Matches internal.normalize_url. The path is case-sensitive.
 * Only known tracking parameters are removed.
 */
export function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (value.length === 0 || /\s/.test(value)) {
    throw new Error("invalid_url: URL is empty or contains whitespace");
  }

  const hashPos = value.indexOf("#");
  const withoutHash = hashPos >= 0 ? value.slice(0, hashPos) : value;
  const queryPos = withoutHash.indexOf("?");
  const base = queryPos >= 0 ? withoutHash.slice(0, queryPos) : withoutHash;
  const query = queryPos >= 0 ? withoutHash.slice(queryPos + 1) : null;

  const schemeEnd = base.indexOf("://");
  if (schemeEnd <= 0) {
    throw new Error("invalid_url: an absolute http(s) URL is required");
  }

  const scheme = base.slice(0, schemeEnd).toLowerCase();
  if (scheme !== "http" && scheme !== "https") {
    throw new Error("invalid_url: scheme must be http or https");
  }

  const rest = base.slice(schemeEnd + 3);
  const slashPos = rest.indexOf("/");
  let host = (slashPos === -1 ? rest : rest.slice(0, slashPos)).toLowerCase().replace(/\.$/, "");
  let path = slashPos === -1 ? "" : rest.slice(slashPos);

  if (host.length === 0 || host.includes("@")) {
    throw new Error("invalid_url: host is missing or contains credentials");
  }

  if (!host.startsWith("[")) {
    if (scheme === "http") host = host.replace(/:80$/, "");
    if (scheme === "https") host = host.replace(/:443$/, "");
  }

  if (path === "/") {
    path = "";
  } else if (path.endsWith("/")) {
    path = path.replace(/\/+$/, "");
  }

  const kept: string[] = [];
  if (query) {
    for (const pair of query.split("&")) {
      if (pair.length === 0) continue;
      const equals = pair.indexOf("=");
      const key = (equals === -1 ? pair : pair.slice(0, equals)).toLowerCase();
      if (key.startsWith("utm_") || TRACKING_KEYS.has(key)) continue;
      kept.push(pair);
    }
  }

  const queryString = kept.length > 0 ? `?${kept.join("&")}` : "";
  return `${scheme}://${host}${path}${queryString}`;
}

export function slugify(input: string): string | null {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : null;
}
