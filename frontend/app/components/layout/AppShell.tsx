"use client";

import {
  CircleUser,
  Dna,
  FlaskConical,
  Home,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useEffect, useState, type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AMBER_MINIMAL, applyTheme, getSavedTheme } from "@/app/lib/theme";
import { ContentPanel } from "./ContentPanel";
import { SiteFooter } from "./SiteFooter";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/discoveries", label: "Discoveries", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about-us", label: "About Us", icon: CircleUser },
] as const;

interface MainbarShellProps {
  children?: ReactNode;
  borderless?: boolean;
}

export const ScrollContainerContext = createContext<HTMLDivElement | null>(
  null,
);

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

function SidebarShellContent({
  children,
  pathname,
}: {
  children?: ReactNode;
  pathname: string;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" isActive={pathname === "/"} asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex items-center gap-2 w-full cursor-pointer bg-transparent border-none p-0 text-left focus-visible:ring-0"
                  aria-label="Toggle sidebar"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Dna size={16} />
                  </div>
                  <div className="group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold leading-none">
                      Drug Discovery AI
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Research Workspace
                    </p>
                  </div>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="flex-1 flex flex-col justify-center">
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
                    className="group-data-[collapsible=icon]:justify-center"
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
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
