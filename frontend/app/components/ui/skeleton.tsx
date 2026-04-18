import type { HTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-[var(--muted)]", className)} {...props} />;
}

export { Skeleton };
