import type { HTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

const ScrollArea = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("overflow-auto scrollbar-thin", className)} {...props}>
    {children}
  </div>
);

export { ScrollArea };
