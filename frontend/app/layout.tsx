import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/app/components/layout/AppShell";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Drug Discovery AI",
  description:
    "Multi-agent precision medicine pipeline for novel drug discovery",
  keywords: ["drug discovery", "AI", "precision medicine", "molecular docking"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen antialiased">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
