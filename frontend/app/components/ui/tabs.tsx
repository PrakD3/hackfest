"use client";
import * as React from "react";
import { cn } from "@/app/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue>({ value: "", onValueChange: () => {} });

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
}
const Tabs = ({
  defaultValue = "",
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) => {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;
  const onChange = onValueChange ?? setInternal;
  return (
    <TabsContext.Provider value={{ value: current, onValueChange: onChange }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-start rounded-md bg-[var(--muted)] p-1 text-[var(--muted-foreground)] overflow-x-auto",
      className
    )}
    {...props}
  />
);

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}
const TabsTrigger = ({ value, className, ...props }: TabsTriggerProps) => {
  const ctx = React.useContext(TabsContext);
  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 shrink-0",
        ctx.value === value
          ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
          : "hover:bg-[var(--background)]/50",
        className
      )}
      {...props}
    />
  );
};

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}
const TabsContent = ({ value, className, ...props }: TabsContentProps) => {
  const ctx = React.useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <div
      className={cn("mt-2 ring-offset-background focus-visible:outline-none", className)}
      {...props}
    />
  );
};

export { Tabs, TabsContent, TabsList, TabsTrigger };
