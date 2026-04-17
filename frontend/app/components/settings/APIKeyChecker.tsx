"use client";
import { useEffect, useState } from "react";
import { getSystemStatus } from "@/app/lib/api";
import { CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";

const SERVICES = [
  { key: "openai", label: "OpenAI", url: "https://platform.openai.com/" },
  { key: "groq", label: "Groq", url: "https://console.groq.com/" },
  { key: "together", label: "Together AI", url: "https://api.together.xyz/" },
  { key: "ncbi", label: "NCBI / PubMed", url: "https://www.ncbi.nlm.nih.gov/account/" },
  { key: "langsmith", label: "LangSmith", url: "https://smith.langchain.com/" },
  { key: "neon", label: "Neon DB", url: "https://neon.tech/" },
];

export function APIKeyChecker() {
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemStatus().then((s) => {
      setStatus(s);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
      <h3 className="font-semibold">API Key Status</h3>
      {SERVICES.map((svc) => {
        const val = status[svc.key];
        const ok = val === true || val === "ok" || val === "connected";
        return (
          <div
            key={svc.key}
            className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
          >
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 size={14} className="animate-spin text-[var(--muted-foreground)]" />
              ) : ok ? (
                <CheckCircle size={14} className="text-emerald-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
              <span className="text-sm">{svc.label}</span>
              {!loading && (
                <span
                  className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-red-500"}`}
                >
                  {ok ? "Connected" : "Not configured"}
                </span>
              )}
            </div>
            <a
              href={svc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline"
            >
              Get key <ExternalLink size={10} />
            </a>
          </div>
        );
      })}
    </div>
  );
}
