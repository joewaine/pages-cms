"use client";

import { useEffect } from "react";
import { RepoSidebar } from "@/components/repo/repo-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { trackVisit } from "@/lib/tracker";
import {
  RepoHeaderProvider,
  useRepoHeaderState,
} from "@/components/repo/repo-header-context";
import { ViewSiteButton, useSiteUrl } from "@/components/repo/view-site-button";

function RepoHeader() {
  const { header } = useRepoHeaderState();
  const siteUrl = useSiteUrl();
  const hasHeaderContent =
    header !== null &&
    header !== undefined &&
    header !== false &&
    header !== "";

  // Keep the bar even on pages that set no header of their own: it carries the
  // sidebar trigger on mobile and the "View your site" button everywhere.
  if (!hasHeaderContent && !siteUrl) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="mr-2 md:hidden" />
      <div className="min-w-0 flex-1">{hasHeaderContent ? header : null}</div>
      <ViewSiteButton size="sm" className="shrink-0" label="View site" />
    </header>
  );
}

export function RepoLayout({ children }: { children: React.ReactNode }) {
  const { config } = useConfig();
  const { owner, repo } = useRepo();

  useEffect(() => {
    if (config?.owner && config?.repo && config?.branch) {
      trackVisit(owner, repo, config.branch);
    }
  }, [config, owner, repo]);

  return (
    <SidebarProvider>
      <RepoHeaderProvider>
        <RepoSidebar />
        <SidebarInset className="min-h-screen">
          <RepoHeader />
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </RepoHeaderProvider>
    </SidebarProvider>
  );
}
