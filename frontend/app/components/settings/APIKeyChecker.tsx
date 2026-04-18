"use client";
import { CheckCircle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getSystemStatus } from "@/app/lib/api";

const SERVICES = [
  { key: "groq", label: "Groq", url: "https://console.groq.com/" },
  { key: "together", label: "Together AI", url: "https://api.together.xyz/" },
  {
    key: "ncbi",
    label: "NCBI / PubMed",
    url: "https://www.ncbi.nlm.nih.gov/account/",
  },
  { key: "langsmith", label: "LangSmith", url: "https://smith.langchain.com/" },
  { key: "database", label: "Neon DB", url: "https://neon.tech/" },
];

export function APIKeyChecker() {
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemStatus().then((s) => {
      setStatus((s?.api_keys as Record<string, unknown>) || {});
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 rounded-xl border border-border bg-card space-y-3">
      <h3 className="font-semibold">API Key Status</h3>
      {SERVICES.map((svc) => {
        const val = status[svc.key];
        const ok = val === true || val === "ok" || val === "connected";
        return (
          <div
            key={svc.key}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
              ) : ok ? (
                <CheckCircle size={14} className="text-emerald-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
              <span className="text-sm">{svc.label}</span>
              {!loading && (
                <span className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-red-500"}`}>
                  {ok ? "Connected" : "Not configured"}
                </span>
              )}
            </div>
            <a
              href={svc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Get key <ExternalLink size={10} />
            </a>
          </div>
        );
      })}
    </div>
  );
}
