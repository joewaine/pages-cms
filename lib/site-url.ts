// Where a repo's published site lives, for the "View your site" button.
//
// Priority: an explicit `settings.site_url` in .pages.yml (set it once a client
// points their real domain at the build), else the deploy URL implied by our
// clone naming convention (repo `clone-<slug>` → https://clone-<slug>.onrender.com).
// Only http(s) is accepted — the value comes from a repo file, so it must never
// become a javascript: link.
const normalize = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;
  return trimmed.replace(/\/+$/, "");
};

export const resolveSiteUrl = (
  configObject: Record<string, any> | null | undefined,
  repo: string | null | undefined,
): string | null => {
  const settings = configObject?.settings;
  const explicit =
    normalize(settings?.site_url) ??
    normalize(settings?.siteUrl) ??
    normalize(configObject?.site_url);
  if (explicit) return explicit;

  if (repo && /^clone-[a-z0-9-]+$/i.test(repo)) {
    return `https://${repo.toLowerCase()}.onrender.com`;
  }
  return null;
};
