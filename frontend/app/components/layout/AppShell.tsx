"use client";

import { CircleUser, Dna, FlaskConical, Home, Loader2, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useEffect, useState } from "react";
import { AMBER_MINIMAL, applyTheme, getSavedTheme } from "@/app/lib/theme";
import { getSessionResult } from "@/app/lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContentPanel } from "./ContentPanel";
import { SiteFooter } from "./SiteFooter";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/discoveries", label: "Discoveries", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about-us", label: "About Us", icon: CircleUser },
] as const;

const ACTIVE_ANALYSIS_KEY = "dda-active-analysis";

type ActiveAnalysis = {
  sessionId: string;
  query?: string;
  startedAt?: number;
};

interface MainbarShellProps {
  children?: ReactNode;
  borderless?: boolean;
}

export const ScrollContainerContext = createContext<HTMLDivElement | null>(null);

function SidebarShell({ children }: { children?: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(getSavedTheme() ?? AMBER_MINIMAL);
  }, []);

  return (
    <SidebarProvider defaultOpen>
      <SidebarShellContent pathname={pathname}>{children}</SidebarShellContent>
    </SidebarProvider>
  );
}

function SidebarShellContent({ children, pathname }: { children?: ReactNode; pathname: string }) {
  const { toggleSidebar } = useSidebar();
  const [activeAnalysis, setActiveAnalysis] = useState<ActiveAnalysis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(ACTIVE_ANALYSIS_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ActiveAnalysis;
      if (parsed?.sessionId) {
        setActiveAnalysis(parsed);
      } else {
        localStorage.removeItem(ACTIVE_ANALYSIS_KEY);
      }
    } catch {
      localStorage.removeItem(ACTIVE_ANALYSIS_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVE_ANALYSIS_KEY) return;
      if (!event.newValue) {
        setActiveAnalysis(null);
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as ActiveAnalysis;
        setActiveAnalysis(parsed?.sessionId ? parsed : null);
      } catch {
        setActiveAnalysis(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!activeAnalysis?.sessionId) return;
    let isMounted = true;

    const poll = async () => {
      try {
        const data = await getSessionResult(activeAnalysis.sessionId);
        if (!isMounted) return;
        const cancelled = Boolean((data as { cancelled?: boolean }).cancelled);
        const complete = Boolean((data as { final_report?: unknown }).final_report);
        const status = (data as { status?: string }).status;
        if (cancelled || complete || status === "not_found") {
          if (typeof window !== "undefined") {
            localStorage.removeItem(ACTIVE_ANALYSIS_KEY);
          }
          setActiveAnalysis(null);
          return;
        }
        const query = typeof (data as { query?: unknown }).query === "string"
          ? ((data as { query?: string }).query as string)
          : activeAnalysis.query;
        if (query && query !== activeAnalysis.query) {
          const updated = { ...activeAnalysis, query };
          if (typeof window !== "undefined") {
            localStorage.setItem(ACTIVE_ANALYSIS_KEY, JSON.stringify(updated));
          }
          setActiveAnalysis(updated);
        }
      } catch {
        // Ignore polling errors and keep last known state.
      }
    };

    poll();
    const interval = window.setInterval(poll, 10000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [activeAnalysis]);

  return (
    <>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader className="flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" isActive={pathname === "/"} asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex items-center gap-2 w-full cursor-pointer bg-transparent border-none p-0 text-left focus-visible:ring-0 group-data-[collapsible=icon]:justify-center"
                  aria-label="Toggle sidebar"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Dna size={16} />
                  </div>
                  <div className="group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold leading-none">Drug Discovery AI</p>
                    <p className="text-xs text-muted-foreground mt-1">Research Workspace</p>
                  </div>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="flex-1 flex flex-col justify-center group-data-[collapsible=icon]:justify-center">
          <SidebarGroup>
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem
                  key={href}
                  className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                >
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === href}
                    tooltip={label}
                    className="text-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&>span]:hidden group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {href === "/research" && activeAnalysis?.sessionId && (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          size="sm"
                          isActive={pathname === `/analysis/${activeAnalysis.sessionId}`}
                          className="gap-2"
                        >
                          <Link
                            href={`/analysis/${activeAnalysis.sessionId}`}
                            title={activeAnalysis.query ?? "Active analysis"}
                          >
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span className="truncate">
                              {activeAnalysis.query ?? "Active analysis"}
                            </span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarTrigger className="fixed left-3 top-3 z-40 md:hidden bg-background border" />
      {children}
    </>
  );
}

function MainbarShell({ children, borderless }: MainbarShellProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollContainerContext.Provider value={scrollEl}>
      <ContentPanel ref={setScrollEl} borderless={borderless || isMobile}>
        <div className="min-h-full flex flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter variant={pathname === "/" ? "section" : "default"} />
        </div>
      </ContentPanel>
    </ScrollContainerContext.Provider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarShell>
      <MainbarShell>{children}</MainbarShell>
    </SidebarShell>
  );
}
