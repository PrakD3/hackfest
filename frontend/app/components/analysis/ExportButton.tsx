"use client";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportSession } from "@/app/lib/api";

interface Props {
  sessionId: string;
}

export function ExportButton({ sessionId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: "json" | "sdf" | "pdf") => {
    setLoading(true);
    try {
      const blob = await exportSession(sessionId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discovery-${sessionId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {(["json", "sdf", "pdf"] as const).map((fmt) => (
        <button
          key={fmt}
          type="button"
          disabled={loading}
          onClick={() => handleExport(fmt)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--muted)] disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {fmt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
