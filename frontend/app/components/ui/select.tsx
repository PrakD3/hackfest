"use client";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-background placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
);

export { Select };
