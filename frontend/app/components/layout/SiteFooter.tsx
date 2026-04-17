import { Dna, ExternalLink } from "lucide-react";
import Link from "next/link";

const TEAM_MEMBERS = [
  {
    name: "Prateek D Shriyan",
    href: "https://github.com/PrakD3",
  },
  {
    name: "Rafan Ahamad Sheik",
    href: "https://github.com/Dinaltium",
  },
  {
    name: "Syed Mohammed Ghouse",
    href: "https://github.com/s4184271-sys",
  },
  {
    name: "Manya H R",
    href: "",
  },
] as const;

const FOOTER_LINKS = [
  { href: "/about-us", label: "About Us" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
] as const;

interface SiteFooterProps {
  variant?: "default" | "section";
}

export function SiteFooter({ variant = "default" }: SiteFooterProps) {
  const isSection = variant === "section";

  return (
    <footer
      className={
        isSection
          ? "card-section relative w-full min-h-svh overflow-hidden bg-card rounded-t-3xl border-t shadow-[0_-12px_48px_rgba(0,0,0,0.18)] flex flex-col justify-center"
          : "relative mt-12 border-t bg-sidebar/60"
      }
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 -top-px h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--primary) 45%, var(--primary) 55%, transparent 100%)",
          opacity: 0.7,
        }}
      />

      <div
        className={
          isSection
            ? "max-w-7xl mx-auto px-8 md:px-16 py-24 md:py-32 w-full"
            : "max-w-7xl mx-auto px-6 py-10"
        }
      >
        <div className={isSection ? "grid gap-16 lg:grid-cols-[1.4fr_1fr_1fr]" : "grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr]"}>
          <div>
            <div className={isSection ? "flex items-center gap-3 mb-6" : "flex items-center gap-2 mb-3"}>
              <div className={isSection ? "w-12 h-12 rounded-md bg-primary/15 text-primary flex items-center justify-center" : "w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center"}>
                <Dna size={isSection ? 24 : 16} />
              </div>
              <div>
                <p className={isSection ? "text-lg font-semibold leading-none" : "text-sm font-semibold leading-none"}>
                  Drug Discovery AI
                </p>
                <p className={isSection ? "text-sm text-muted-foreground mt-1" : "text-xs text-muted-foreground mt-1"}>
                  Hackfest26 - 24
                </p>
              </div>
            </div>

            <p className={isSection ? "text-base text-muted-foreground max-w-xl leading-relaxed" : "text-sm text-muted-foreground max-w-xl leading-relaxed"}>
              A multi-agent research platform for computational lead discovery,
              selectivity-aware ranking, and explainable evidence synthesis.
            </p>
          </div>

          <div>
            <p className={isSection ? "text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-6" : "text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3"}>
              Team
            </p>
            <ul className={isSection ? "space-y-4" : "space-y-2"}>
              {TEAM_MEMBERS.map((member) => (
                <li key={member.name} className={isSection ? "text-base" : "text-sm"}>
                  {member.href ? (
                    <a
                      href={member.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <span>{member.name}</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{member.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={isSection ? "text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-6" : "text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3"}>
              Info
            </p>
            <ul className={isSection ? "space-y-4" : "space-y-2"}>
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isSection ? "text-base text-muted-foreground hover:text-foreground transition-colors" : "text-sm text-muted-foreground hover:text-foreground transition-colors"}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={isSection ? "mt-16 pt-8 border-t text-sm text-muted-foreground flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" : "mt-8 pt-4 border-t text-xs text-muted-foreground flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"}
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <p>Hackfest26 Team 24. Computational predictions only.</p>
          <p>Not clinical advice. For research and educational purposes.</p>
        </div>
      </div>
    </footer>
  );
}
