"use client";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onValueChange?: (value: number[]) => void;
}
function Slider({
  className,
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onChange,
  ...props
}: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        onValueChange?.([Number(e.target.value)]);
        onChange?.(e);
      }}
      className={cn("w-full h-2 rounded-full accent-[var(--primary)] cursor-pointer", className)}
      {...props}
    />
  );
}

export { Slider };
