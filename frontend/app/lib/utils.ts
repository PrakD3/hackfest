import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBindingEnergy(energy: number | null | undefined): string {
  if (energy == null) return "N/A";
  return `${energy.toFixed(2)} kcal/mol`;
}

export function bindingEnergyColor(energy: number | null | undefined): string {
  if (energy == null) return "text-gray-400";
  if (energy <= -9) return "text-green-600";
  if (energy <= -7) return "text-amber-500";
  return "text-red-500";
}

export function selectivityColor(label: "High" | "Moderate" | "Low" | "Dangerous" | string): string {
  switch (label) {
    case "High": return "text-green-600";
    case "Moderate": return "text-amber-600";
    case "Low": return "text-amber-400";
    case "Dangerous": return "text-red-600";
    default: return "text-gray-400";
  }
}

export function selectivityBgColor(label: string): string {
  switch (label) {
    case "High": return "bg-green-100 text-green-800 border-green-200";
    case "Moderate": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Low": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Dangerous": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function truncateSmiles(smiles: string, maxLen = 30): string {
  return smiles.length > maxLen ? `${smiles.slice(0, maxLen)}...` : smiles;
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
