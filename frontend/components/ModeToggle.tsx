"use client";

import { create } from "zustand";
import { useTourStore } from "./TourGuide";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const useModeStore = create<{
  isEasyMode: boolean;
  setEasyMode: (val: boolean) => void;
}>((set) => ({
  isEasyMode: true, // Default to easy mode for new users to see the tour
  setEasyMode: (val) => set({ isEasyMode: val }),
}));

export function ModeToggle() {
  const { isEasyMode, setEasyMode } = useModeStore();
  const { isActive } = useTourStore();
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <div className="fixed top-4 right-4 z-[9000] flex items-center gap-3">
      {isEasyMode && !isActive && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("tour:show-welcome"))}
          className="text-[13px] font-semibold text-[var(--primary)] hover:opacity-80 transition-opacity bg-[var(--primary)]/10 px-3 py-1.5 rounded-full"
        >
          Want a tour guide?
        </button>
      )}
      <div className="flex items-center bg-background border shadow-sm rounded-full p-1" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setEasyMode(true)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isEasyMode 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Easy
        </button>
        <button
          onClick={() => setEasyMode(false)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !isEasyMode 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Advanced
        </button>
      </div>
    </div>
  );
}
