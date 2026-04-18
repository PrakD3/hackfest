"use client";
import { type ReactNode, useState } from "react";
import { cn } from "@/app/lib/utils";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
}
function Tooltip({ children, content, className }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={cn(
            "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded bg-[var(--foreground)] text-[var(--background)] whitespace-nowrap shadow",
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export { Tooltip };
