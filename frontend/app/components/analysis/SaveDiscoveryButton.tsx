"use client";
import { useState } from "react";
import { toast } from "sonner";
import { saveDiscovery } from "@/app/lib/api";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

interface Props {
  sessionId: string;
  initialDiscoveryId: string | null;
}

export function SaveDiscoveryButton({ sessionId, initialDiscoveryId }: Props) {
  const [state, setState] = useState<"idle" | "saving" | "saved">(
    initialDiscoveryId ? "saved" : "idle"
  );
  const [, setDiscoveryId] = useState<string | null>(initialDiscoveryId);

  const handleSave = async () => {
    if (state !== "idle") return;
    setState("saving");
    try {
      const res = await saveDiscovery(sessionId);
      setDiscoveryId(res.discovery_id);
      setState("saved");
      toast.success("Discovery saved!", {
        description: "View it in the Discoveries page.",
      });
    } catch {
      setState("idle");
      toast.error("Failed to save discovery");
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={state !== "idle"}
      className="flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--muted)] disabled:opacity-60 transition-colors"
    >
      {state === "saving" && <Loader2 size={14} className="animate-spin" />}
      {state === "saved" && <BookmarkCheck size={14} className="text-emerald-500" />}
      {state === "idle" && <Bookmark size={14} />}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save Discovery"}
    </button>
  );
}
