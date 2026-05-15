import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAttribution } from "@/hooks/useAttribution";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Copy, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "settings-api-url";
const RESULT_STORAGE_KEY = "settings-last-test";

interface MatchItem {
  id?: string;
  score?: number;
  meta?: Record<string, unknown>;
}

interface TestResponseDetails {
  durationMs: number;
  upstreamMs?: number;
  embeddingMs?: number;
  edgeOverheadMs?: number;
  matchCount?: number;
  indexName?: string;
  errorCode?: string;
  errorMessage?: string;
  rawMatches?: MatchItem[];
  answerPreview?: string;
}

type TestResult =
  | { status: "idle" }
  | { status: "running" }
  | { status: "success"; details: TestResponseDetails }
  | { status: "error"; details: TestResponseDetails };

const isValidHttpsUrl = (value: string) => {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !!u.host;
  } catch {
    return false;
  }
};

const SAMPLE_QUERY = "configuration test ping";

const SettingsPage = () => {
  const { showAttribution, setShowAttribution } = useAttribution();
  const [apiUrl, setApiUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) ?? "";
  });
  const [result, setResult] = useState<TestResult>(() => {
    if (typeof window === "undefined") return { status: "idle" };
    try {
      const raw = localStorage.getItem(RESULT_STORAGE_KEY);
      if (!raw) return { status: "idle" };
      const parsed = JSON.parse(raw) as TestResult;
      if (parsed.status === "success" || parsed.status === "error") return parsed;
      return { status: "idle" };
    } catch {
      return { status: "idle" };
    }
  });
  const [minScore, setMinScore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(localStorage.getItem("settings-min-score"));
    return Number.isFinite(v) ? v : 0;
  });
  const [expandedMatches, setExpandedMatches] = useState<Record<number, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("settings-expanded-matches") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("settings-min-score", String(minScore));
    }
  }, [minScore]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("settings-expanded-matches", JSON.stringify(expandedMatches));
    }
  }, [expandedMatches]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, apiUrl);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (result.status === "success" || result.status === "error") {
      localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
    }
  }, [result]);

  const location = useLocation();
  useEffect(() => {
    if (location.hash !== "#test-results") return;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById("test-results");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (attempts++ < 40) setTimeout(tryScroll, 100);
    };
    tryScroll();
  }, [location.hash, result.status]);

  const urlValid = apiUrl === "" || isValidHttpsUrl(apiUrl);
  const urlError =
    apiUrl !== "" && !urlValid
      ? "Must be a full https:// base URL (e.g. https://api.example.com/v1)"
      : null;

  const runTest = async () => {
    setResult({ status: "running" });
    const startedAt = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("vector-search", {
        body: { query: SAMPLE_QUERY, topK: 1 },
      });
      const durationMs = Math.round(performance.now() - startedAt);

      if (error) {
        let payload: { error?: string; code?: string } = {};
        try {
          const ctx = (error as unknown as { context?: { body?: string } }).context;
          if (ctx?.body) payload = JSON.parse(ctx.body);
        } catch {
          // ignore
        }
        setResult({
          status: "error",
          details: {
            durationMs,
            errorMessage: payload.error || error.message || "Edge function call failed",
            errorCode: payload.code,
          },
        });
        return;
      }

      const upstreamMs = data?.debug?.timings?.upstreamMs;
      const embeddingMs = data?.debug?.timings?.embeddingMs;
      const totalEdgeMs = data?.debug?.timings?.totalMs;
      setResult({
        status: "success",
        details: {
          durationMs,
          upstreamMs,
          embeddingMs,
          edgeOverheadMs:
            typeof totalEdgeMs === "number" && typeof upstreamMs === "number"
              ? Math.max(0, totalEdgeMs - upstreamMs)
              : undefined,
          matchCount: data?.debug?.matchCount ?? 0,
          indexName: data?.debug?.indexName,
          rawMatches: data?.debug?.rawMatches,
          answerPreview:
            typeof data?.answer === "string" ? data.answer.slice(0, 200) : undefined,
        },
      });
    } catch (err) {
      setResult({
        status: "error",
        details: {
          durationMs: Math.round(performance.now() - startedAt),
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
  };

  const requestPreview = {
    function: "vector-search",
    method: "POST",
    body: { query: SAMPLE_QUERY, topK: 1 },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Customize how CodeRAG appears and verify your backend configuration.
          </p>
        </div>

        <div className="rounded-xl border border-border p-6 bg-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="attribution" className="text-base font-medium">
                Show "Powered by" attribution
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Display a small attribution badge in the footer.
              </p>
            </div>
            <Switch
              id="attribution"
              checked={showAttribution}
              onCheckedChange={setShowAttribution}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-6 bg-card space-y-4">
          <div>
            <h2 className="text-base font-medium">Vector database URL</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Validate the format of your API base URL. The actual value is stored
              securely as a backend secret — this field is for verification only.
              Your input is saved locally so it persists across visits.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url" className="text-sm">
              API base URL
            </Label>
            <Input
              id="api-url"
              type="url"
              placeholder="https://api.example.com/v1"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              aria-invalid={!!urlError}
              className={urlError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {urlError ? (
              <p className="text-xs text-destructive">{urlError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Examples: <code className="px-1 rounded bg-muted">https://api.example.com/v1</code>
                {" "}or{" "}
                <code className="px-1 rounded bg-muted">https://your-host.example.com:8080/api/v1</code>
              </p>
            )}
            {apiUrl && urlValid && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Looks like a valid base URL
              </p>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div>
              <h3 className="text-sm font-medium">Test configuration</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Runs a sample vector search to verify the edge function can reach
                the configured API.
              </p>
            </div>
            <Button onClick={runTest} disabled={result.status === "running"}>
              {result.status === "running" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing…
                </>
              ) : (
                "Run test"
              )}
            </Button>

            {result.status === "success" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    Connection successful
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Got {result.details.matchCount} match
                    {result.details.matchCount === 1 ? "" : "es"} in {result.details.durationMs}ms.
                  </p>
                </div>
              </div>
            )}

            {result.status === "error" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm flex gap-2">
                <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <p className="font-medium text-destructive">Test failed</p>
                  <p className="text-xs text-muted-foreground">
                    {result.details.errorMessage}
                  </p>
                  {result.details.errorCode && (
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      Code: {result.details.errorCode}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runTest}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Retry test
                  </Button>
                </div>
              </div>
            )}

            {(result.status === "success" || result.status === "error") && (
              <div id="test-results" className="space-y-3 text-xs scroll-mt-24">
                <div>
                  <div className="text-muted-foreground mb-1">Timing breakdown</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Total (client)", value: result.details.durationMs },
                      { label: "Upstream API", value: result.details.upstreamMs },
                      { label: "Embedding", value: result.details.embeddingMs },
                      { label: "Edge overhead", value: result.details.edgeOverheadMs },
                    ].map((t) => (
                      <div key={t.label} className="rounded-md border border-border bg-muted/30 p-2">
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                          {t.label}
                        </div>
                        <div className="font-mono text-sm">
                          {typeof t.value === "number" ? `${t.value}ms` : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.status === "success" && result.details.rawMatches && result.details.rawMatches.length > 0 && (() => {
                  const all = result.details.rawMatches;
                  const filtered = all.filter((m) => {
                    const pct = typeof m.score === "number" ? m.score * 100 : 100;
                    return pct >= minScore;
                  });
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <div className="text-muted-foreground">
                          Top matches ({filtered.length}/{all.length})
                        </div>
                        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          Min score: <span className="font-mono text-foreground">{minScore}%</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={minScore}
                            onChange={(e) => setMinScore(Number(e.target.value))}
                            className="w-32 accent-primary"
                          />
                        </label>
                      </div>
                      <div className="space-y-2">
                        {filtered.length === 0 && (
                          <p className="text-muted-foreground italic">
                            No matches meet the minimum score threshold.
                          </p>
                        )}
                        {filtered.map((m, i) => {
                          const meta = (m.meta || {}) as Record<string, unknown>;
                          const path = (meta.file_path || meta.path || meta.source || "unknown") as string;
                          const lines = (meta.lines || meta.line_range || "") as string;
                          const snippet = (meta.code_snippet || meta.content || meta.text || "") as string;
                          const scorePct =
                            typeof m.score === "number" ? Math.round(m.score * 100) : null;
                          const isOpen = expandedMatches[i] ?? false;
                          return (
                            <div key={i} className="rounded-md border border-border bg-card/50 p-2 space-y-1">
                              <button
                                onClick={() =>
                                  setExpandedMatches((prev) => ({ ...prev, [i]: !isOpen }))
                                }
                                className="flex items-center justify-between gap-2 w-full text-left"
                              >
                                <div className="flex items-center gap-1 min-w-0">
                                  {snippet ? (
                                    isOpen ? (
                                      <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                                    )
                                  ) : null}
                                  <div className="font-mono text-[11px] truncate" title={path}>
                                    {path}
                                    {lines ? <span className="text-muted-foreground"> · {lines}</span> : null}
                                  </div>
                                </div>
                                {scorePct !== null && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary">
                                    {scorePct}%
                                  </span>
                                )}
                              </button>
                              {snippet && isOpen && (
                                <pre className="bg-muted/40 rounded p-1.5 overflow-x-auto text-[11px] max-h-64">
{snippet}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-muted-foreground">Request / Response</div>
                    <button
                      onClick={async () => {
                        const payload = {
                          request: requestPreview,
                          response: {
                            status: result.status,
                            ...result.details,
                          },
                        };
                        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                        toast.success("Debug JSON copied");
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3 h-3" />
                      Copy debug JSON
                    </button>
                  </div>
                  <pre className="bg-muted/40 rounded-md p-2 overflow-x-auto">
{JSON.stringify(requestPreview, null, 2)}
                  </pre>
                  <pre className="bg-muted/40 rounded-md p-2 overflow-x-auto max-h-72 mt-2">
{JSON.stringify(
  {
    status: result.status,
    ...result.details,
  },
  null,
  2
)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SettingsPage;
