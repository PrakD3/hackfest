"use client";

import {
  CircleUser,
  Dna,
  FlaskConical,
  Home,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DiscoveryRecord } from "@/app/lib/types";
import { getSessionResult, listDiscoveries } from "@/app/lib/api";
import { AMBER_MINIMAL, applyTheme, getSavedTheme } from "@/app/lib/theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
] as const;

const MORE_INFO_ITEMS = [
  { href: "/settings", label: "Settings", icon: CircleUser },
  { href: "/about-us", label: "About Us", icon: CircleUser },
  { href: "/privacy-policy", label: "Privacy Policy", icon: ShieldCheck },
  { href: "/terms-and-conditions", label: "Terms & Conditions", icon: ShieldCheck },
] as const;

const ACTIVE_ANALYSES_KEY = "dda-active-analyses";
const LEGACY_ACTIVE_ANALYSIS_KEY = "dda-active-analysis";

type ActiveAnalysis = {
  sessionId: string;
  query?: string;
  diseaseName?: string;
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
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "19rem",
        } as CSSProperties
      }
    >
      <SidebarShellContent pathname={pathname}>{children}</SidebarShellContent>
    </SidebarProvider>
  );
}

function SidebarShellContent({ children, pathname }: { children?: ReactNode; pathname: string }) {
  const { toggleSidebar } = useSidebar();
  const [activeAnalyses, setActiveAnalyses] = useState<ActiveAnalysis[]>([]);
  const [recentDiscoveries, setRecentDiscoveries] = useState<DiscoveryRecord[]>([]);
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const moreInfoRef = useRef<HTMLDivElement | null>(null);

  const readActiveAnalyses = (): ActiveAnalysis[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(ACTIVE_ANALYSES_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      const normalized = parsed
        .filter((item): item is ActiveAnalysis => Boolean(item && typeof item.sessionId === "string"))
        .map((item) => ({
          sessionId: item.sessionId,
          query: typeof item.query === "string" ? item.query : undefined,
          diseaseName: typeof item.diseaseName === "string" ? item.diseaseName : undefined,
          startedAt: typeof item.startedAt === "number" ? item.startedAt : undefined,
        }));
      return normalized;
    } catch {
      return [];
    }
  };

  const writeActiveAnalyses = (items: ActiveAnalysis[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACTIVE_ANALYSES_KEY, JSON.stringify(items));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const items = readActiveAnalyses();
    if (items.length) {
      setActiveAnalyses(items);
      return;
    }

    const legacyStored = localStorage.getItem(LEGACY_ACTIVE_ANALYSIS_KEY);
    if (!legacyStored) return;
    try {
      const parsed = JSON.parse(legacyStored) as ActiveAnalysis;
      if (parsed?.sessionId) {
        const migrated = [parsed];
        writeActiveAnalyses(migrated);
        setActiveAnalyses(migrated);
      }
    } finally {
      localStorage.removeItem(LEGACY_ACTIVE_ANALYSIS_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVE_ANALYSES_KEY && event.key !== LEGACY_ACTIVE_ANALYSIS_KEY) return;
      if (event.key === LEGACY_ACTIVE_ANALYSIS_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as ActiveAnalysis;
          if (parsed?.sessionId) {
            const migrated = [parsed];
            writeActiveAnalyses(migrated);
            setActiveAnalyses(migrated);
          }
        } finally {
          localStorage.removeItem(LEGACY_ACTIVE_ANALYSIS_KEY);
        }
        return;
      }
      setActiveAnalyses(readActiveAnalyses());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!activeAnalyses.length) return;
    let isMounted = true;

    const poll = async () => {
      try {
        const nextItems = (
          await Promise.all(
            activeAnalyses.map(async (analysis): Promise<ActiveAnalysis | null> => {
              const data = await getSessionResult(analysis.sessionId);
              const cancelled = Boolean((data as { cancelled?: boolean }).cancelled);
              const complete = Boolean((data as { final_report?: unknown }).final_report);
              const status = (data as { status?: string }).status;
              if (cancelled || complete || status === "not_found") return null;

              const query =
                typeof (data as { query?: unknown }).query === "string"
                  ? ((data as { query?: string }).query as string)
                  : analysis.query;

              const mutationContext =
                (data as { mutation_context?: { disease_context?: unknown } }).mutation_context ?? {};
              const diseaseName =
                typeof mutationContext.disease_context === "string" &&
                mutationContext.disease_context.trim() &&
                mutationContext.disease_context !== "unknown"
                  ? mutationContext.disease_context.trim()
                  : analysis.diseaseName;

              return { ...analysis, query, diseaseName };
            })
          )
        ).filter((item): item is ActiveAnalysis => Boolean(item));
        if (!isMounted) return;

        const sortedNext = [...nextItems].sort(
          (a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)
        );
        const prevSerialized = JSON.stringify(
          [...activeAnalyses].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
        );
        const nextSerialized = JSON.stringify(sortedNext);
        if (prevSerialized !== nextSerialized) {
          writeActiveAnalyses(sortedNext);
          setActiveAnalyses(sortedNext);
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
  }, [activeAnalyses]);

  useEffect(() => {
    let isMounted = true;

    const refreshDiscoveries = async () => {
      try {
        const data = await listDiscoveries();
        if (!isMounted) return;
        const normalized = (data as unknown as DiscoveryRecord[])
          .filter((item) => item?.id && item?.session_id)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        setRecentDiscoveries(normalized);
      } catch {
        if (!isMounted) return;
        setRecentDiscoveries([]);
      }
    };

    void refreshDiscoveries();
    const interval = window.setInterval(refreshDiscoveries, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const discoveryLabel = (discovery: DiscoveryRecord): string => {
    if (discovery.query?.trim()) return discovery.query.trim();
    const gene = discovery.gene?.trim();
    const mutation = discovery.mutation?.trim();
    if (gene && mutation) return `${gene} ${mutation}`;
    if (gene) return gene;
    return "Discovery";
  };

  useEffect(() => {
    if (!isMoreInfoOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!moreInfoRef.current) return;
      if (!moreInfoRef.current.contains(event.target as Node)) {
        setIsMoreInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMoreInfoOpen]);

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

        <SidebarContent className="flex-1 flex min-h-0 flex-col justify-start group-data-[collapsible=icon]:justify-start">
          <SidebarGroup className="flex-1 min-h-0">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center flex-1 min-h-0">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem
                  key={href}
                  className={`group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center ${
                    href === "/discoveries" ? "flex-1 min-h-0" : ""
                  }`}
                >
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === href}
                    tooltip={label}
                    className="text-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&>span]:hidden group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
                  >
                    <Link href={href}>
                      <Icon />
                      <span className="font-semibold">{label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {href === "/research" && activeAnalyses.length > 0 && (
                    <SidebarMenuSub className="max-h-56 overflow-y-auto pr-1">
                      {activeAnalyses
                        .slice()
                        .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
                        .map((analysis) => (
                          <SidebarMenuSubItem key={analysis.sessionId}>
                            <SidebarMenuSubButton
                              asChild
                              size="sm"
                              isActive={pathname === `/analysis/${analysis.sessionId}`}
                              className="gap-2"
                            >
                              <Link
                                href={`/analysis/${analysis.sessionId}`}
                                title={analysis.diseaseName ?? analysis.query ?? "Active analysis"}
                              >
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="truncate">
                                  {analysis.diseaseName ?? analysis.query ?? "Active analysis"}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                  )}
                  {href === "/discoveries" && recentDiscoveries.length > 0 && (
                    <SidebarMenuSub className="mt-1 h-full min-h-0 overflow-y-auto pr-1">
                      {recentDiscoveries.map((discovery) => (
                        <SidebarMenuSubItem key={discovery.id}>
                          <SidebarMenuSubButton
                            asChild
                            size="sm"
                            isActive={pathname === `/analysis/${discovery.session_id}`}
                            className="gap-2"
                          >
                            <Link
                              href={`/analysis/${discovery.session_id}`}
                              title={discoveryLabel(discovery)}
                            >
                              <span className="truncate">{discoveryLabel(discovery)}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:items-center">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <div ref={moreInfoRef} className="relative group/moreinfo w-full">
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === "/settings" ||
                    pathname === "/about-us" ||
                    pathname === "/privacy-policy" ||
                    pathname === "/terms-and-conditions"
                  }
                  tooltip="More info"
                  className="text-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&>span]:hidden group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
                >
                  <button
                    type="button"
                    className="relative w-full"
                    onClick={() => setIsMoreInfoOpen((prev) => !prev)}
                  >
                    <MoreHorizontal />
                    <span className="font-semibold absolute left-1/2 -translate-x-1/2">
                      More info
                    </span>
                  </button>
                </SidebarMenuButton>
                <div
                  className={`absolute bottom-full left-0 right-0 z-50 mb-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-xl transition-all duration-150 group-data-[collapsible=icon]:hidden ${
                    isMoreInfoOpen
                      ? "pointer-events-auto opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  <div className="space-y-1">
                    {MORE_INFO_ITEMS.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setIsMoreInfoOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--muted)]"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
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
