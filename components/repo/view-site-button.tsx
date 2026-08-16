"use client";

// "View your site" — the one thing a client always wants within reach while
// editing: their live site, in a new tab. Rendered in the sidebar and in the
// sticky header so it's on screen on every page, desktop and mobile.
import { ArrowUpRight } from "lucide-react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { resolveSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export function useSiteUrl() {
  const { config } = useConfig();
  const { repo } = useRepo();
  return resolveSiteUrl(config?.object, config?.repo ?? repo);
}

export function ViewSiteButton({
  className,
  size = "default",
  label = "View your site",
}: {
  className?: string;
  size?: "default" | "sm";
  label?: string;
}) {
  const siteUrl = useSiteUrl();
  if (!siteUrl) return null;

  return (
    <a
      href={siteUrl}
      target="_blank"
      rel="noreferrer noopener"
      title={`Open ${siteUrl.replace(/^https?:\/\//, "")} in a new tab`}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "sm" ? "h-8 px-3 text-sm" : "h-9 w-full px-3 text-sm",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      <ArrowUpRight className="size-4 shrink-0" />
    </a>
  );
}
