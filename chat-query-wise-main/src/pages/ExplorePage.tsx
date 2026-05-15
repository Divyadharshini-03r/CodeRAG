import Navbar from "@/components/Navbar";
import { FileCode, FolderOpen, ChevronRight, Hash, Braces, Eye, Search, Download, Network, List, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface FileEntry {
  name: string;
  path: string;
  language: string;
  summary: string;
  functions: { name: string; lines: string; purpose: string }[];
  dependencies: string[];
}

const mockFiles: FileEntry[] = [
  {
    name: "AuthService.java",
    path: "src/main/java/com/app/service/AuthService.java",
    language: "Java",
    summary: "Core authentication service handling user login, token generation, and session management.",
    functions: [
      { name: "loginUser", lines: "L24-L33", purpose: "Validates credentials and returns JWT token" },
      { name: "registerUser", lines: "L35-L52", purpose: "Creates new user with hashed password" },
      { name: "refreshToken", lines: "L54-L68", purpose: "Generates new JWT from refresh token" },
    ],
    dependencies: ["UserRepository", "JwtTokenProvider", "BCryptEncoder"],
  },
  {
    name: "UserRepository.py",
    path: "src/repositories/user_repository.py",
    language: "Python",
    summary: "Database access layer for user CRUD operations with connection pooling.",
    functions: [
      { name: "find_by_email", lines: "L12-L20", purpose: "Looks up user by email address" },
      { name: "create_user", lines: "L22-L38", purpose: "Inserts new user record" },
      { name: "update_password", lines: "L40-L50", purpose: "Updates hashed password" },
    ],
    dependencies: ["DatabasePool", "UserModel"],
  },
  {
    name: "AuthController.ts",
    path: "src/controllers/auth.controller.ts",
    language: "TypeScript",
    summary: "REST API controller exposing authentication endpoints (login, register, refresh).",
    functions: [
      { name: "handleLogin", lines: "L15-L28", purpose: "POST /auth/login endpoint handler" },
      { name: "handleRegister", lines: "L30-L45", purpose: "POST /auth/register endpoint handler" },
    ],
    dependencies: ["AuthService", "ValidationMiddleware"],
  },
  {
    name: "JwtTokenProvider.java",
    path: "src/main/java/com/app/security/JwtTokenProvider.java",
    language: "Java",
    summary: "JWT token creation, validation, and parsing utility.",
    functions: [
      { name: "generateToken", lines: "L18-L30", purpose: "Creates signed JWT with user claims" },
      { name: "validateToken", lines: "L32-L42", purpose: "Verifies token signature and expiry" },
    ],
    dependencies: ["SecurityConfig"],
  },
  {
    name: "PaymentService.go",
    path: "src/services/payment_service.go",
    language: "Go",
    summary: "Handles payment processing, transaction logging, and refund flows via Stripe.",
    functions: [
      { name: "ChargeCard", lines: "L20-L42", purpose: "Charges a card and records the transaction" },
      { name: "RefundTransaction", lines: "L44-L60", purpose: "Issues a refund for a prior charge" },
    ],
    dependencies: ["StripeClient", "TransactionRepo"],
  },
  {
    name: "EmailNotifier.py",
    path: "src/notifications/email_notifier.py",
    language: "Python",
    summary: "Sends transactional emails using SMTP with templating and retry logic.",
    functions: [
      { name: "send_email", lines: "L15-L32", purpose: "Renders template and sends via SMTP" },
      { name: "retry_failed", lines: "L34-L48", purpose: "Retries previously failed deliveries" },
    ],
    dependencies: ["SmtpClient", "TemplateEngine"],
  },
  {
    name: "CacheManager.ts",
    path: "src/cache/cache-manager.ts",
    language: "TypeScript",
    summary: "In-memory LRU cache with TTL support and Redis fallback.",
    functions: [
      { name: "get", lines: "L10-L22", purpose: "Returns cached value or undefined" },
      { name: "set", lines: "L24-L36", purpose: "Stores value with optional TTL" },
      { name: "invalidate", lines: "L38-L46", purpose: "Removes a key from cache" },
    ],
    dependencies: ["RedisClient", "LRUCache"],
  },
  {
    name: "Logger.rs",
    path: "src/utils/logger.rs",
    language: "Rust",
    summary: "Structured logging with severity levels and JSON output for observability.",
    functions: [
      { name: "log_info", lines: "L8-L18", purpose: "Emits an info-level structured log" },
      { name: "log_error", lines: "L20-L32", purpose: "Emits an error log with stack trace" },
    ],
    dependencies: ["serde_json"],
  },
  {
    name: "OrderController.java",
    path: "src/main/java/com/app/controller/OrderController.java",
    language: "Java",
    summary: "REST endpoints for order creation, lookup, and cancellation.",
    functions: [
      { name: "createOrder", lines: "L22-L40", purpose: "POST /orders endpoint handler" },
      { name: "getOrder", lines: "L42-L52", purpose: "GET /orders/{id} endpoint handler" },
      { name: "cancelOrder", lines: "L54-L70", purpose: "DELETE /orders/{id} endpoint handler" },
    ],
    dependencies: ["OrderService", "AuthGuard"],
  },
  {
    name: "ImageProcessor.cpp",
    path: "src/image/image_processor.cpp",
    language: "C++",
    summary: "GPU-accelerated image transformations: resize, crop, and filter.",
    functions: [
      { name: "resize", lines: "L30-L52", purpose: "Resamples image with configurable filter" },
      { name: "applyFilter", lines: "L54-L78", purpose: "Applies a kernel-based filter" },
    ],
    dependencies: ["CudaRuntime", "ImageBuffer"],
  },
  {
    name: "RateLimiter.js",
    path: "src/middleware/rate-limiter.js",
    language: "JavaScript",
    summary: "Token-bucket rate limiter middleware for Express APIs.",
    functions: [
      { name: "consume", lines: "L12-L28", purpose: "Consumes a token if available" },
      { name: "middleware", lines: "L30-L48", purpose: "Express middleware wrapper" },
    ],
    dependencies: ["RedisClient"],
  },
  {
    name: "SearchService.py",
    path: "src/services/search_service.py",
    language: "Python",
    summary: "Full-text and vector search facade across indexed documents.",
    functions: [
      { name: "search", lines: "L18-L40", purpose: "Hybrid search across multiple indexes" },
      { name: "rerank", lines: "L42-L58", purpose: "Reranks results by relevance score" },
    ],
    dependencies: ["ElasticClient", "EmbeddingModel"],
  },
  {
    name: "WebhookHandler.ts",
    path: "src/webhooks/webhook-handler.ts",
    language: "TypeScript",
    summary: "Validates and dispatches incoming webhook events to subscribers.",
    functions: [
      { name: "verifySignature", lines: "L14-L26", purpose: "Verifies HMAC signature" },
      { name: "dispatch", lines: "L28-L46", purpose: "Routes event to registered handlers" },
    ],
    dependencies: ["CryptoUtils", "EventBus"],
  },
  {
    name: "MetricsCollector.go",
    path: "src/metrics/metrics_collector.go",
    language: "Go",
    summary: "Collects runtime metrics and exports them in Prometheus format.",
    functions: [
      { name: "Record", lines: "L18-L30", purpose: "Records a metric sample" },
      { name: "Export", lines: "L32-L48", purpose: "Serializes metrics for scraping" },
    ],
    dependencies: ["PrometheusRegistry"],
  },
  {
    name: "FeatureFlags.rb",
    path: "src/config/feature_flags.rb",
    language: "Ruby",
    summary: "Runtime feature flag evaluation with user targeting.",
    functions: [
      { name: "enabled?", lines: "L10-L22", purpose: "Returns true if flag is on for user" },
      { name: "rollout", lines: "L24-L38", purpose: "Computes deterministic rollout bucket" },
    ],
    dependencies: ["ConfigStore"],
  },
  {
    name: "DatabasePool.java",
    path: "src/main/java/com/app/db/DatabasePool.java",
    language: "Java",
    summary: "Connection pool manager with health checks and metrics.",
    functions: [
      { name: "getConnection", lines: "L24-L40", purpose: "Returns a pooled connection" },
      { name: "release", lines: "L42-L52", purpose: "Returns connection to the pool" },
    ],
    dependencies: ["HikariCP", "HealthCheck"],
  },
  {
    name: "ValidationMiddleware.ts",
    path: "src/middleware/validation.middleware.ts",
    language: "TypeScript",
    summary: "Schema-based request validation using Zod with detailed error responses.",
    functions: [
      { name: "validateBody", lines: "L12-L28", purpose: "Validates request body against schema" },
      { name: "validateQuery", lines: "L30-L44", purpose: "Validates query params" },
    ],
    dependencies: ["Zod"],
  },
];

const langColors: Record<string, string> = {
  Java: "text-code-function",
  Python: "text-code-string",
  TypeScript: "text-primary",
  JavaScript: "text-code-function",
};

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV(files: FileEntry[]): string {
  const header = ["name", "path", "language"];
  const rows = files.map((f) =>
    [f.name, f.path, f.language]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

interface GraphViewProps {
  files: FileEntry[];
  onSelect: (f: FileEntry) => void;
}

type HighlightKey = { type: "file" | "dep"; name: string } | null;

const GraphView = ({ files, onSelect }: GraphViewProps) => {
  const [highlight, setHighlight] = useState<HighlightKey>(null);
  // Layout files in a grid; draw lines from each file to its dependency nodes.
  const cols = 3;
  const cellW = 220;
  const cellH = 110;
  const padX = 40;
  const padY = 40;

  const fileNodes = files.map((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      file: f,
      x: padX + col * cellW + cellW / 2,
      y: padY + row * cellH + cellH / 2,
    };
  });

  // Collect unique dependency names not in files
  const fileNames = new Set(files.map((f) => f.name.replace(/\.[^.]+$/, "")));
  const externalDeps = Array.from(
    new Set(files.flatMap((f) => f.dependencies).filter((d) => !fileNames.has(d))),
  );
  const depRowsStartY = padY + Math.ceil(files.length / cols) * cellH + 40;
  const depCols = 4;
  const depNodes = externalDeps.map((d, i) => {
    const col = i % depCols;
    const row = Math.floor(i / depCols);
    return {
      name: d,
      x: padX + col * 200 + 100,
      y: depRowsStartY + row * 70,
    };
  });

  const findNode = (name: string) => {
    const fn = fileNodes.find((n) => n.file.name.replace(/\.[^.]+$/, "") === name);
    if (fn) return { x: fn.x, y: fn.y };
    const dn = depNodes.find((n) => n.name === name);
    return dn ? { x: dn.x, y: dn.y } : null;
  };

  const width = padX * 2 + cols * cellW;
  const height = depRowsStartY + Math.ceil(externalDeps.length / depCols) * 70 + 40;

  const stripExt = (n: string) => n.replace(/\.[^.]+$/, "");

  // Compute the set of related node keys based on current highlight.
  const relatedFiles = new Set<string>(); // file names
  const relatedDeps = new Set<string>(); // dep names
  if (highlight) {
    if (highlight.type === "file") {
      const f = files.find((x) => x.name === highlight.name);
      if (f) {
        relatedFiles.add(f.name);
        f.dependencies.forEach((d) => {
          if (fileNames.has(d)) {
            const match = files.find((x) => stripExt(x.name) === d);
            if (match) relatedFiles.add(match.name);
          } else {
            relatedDeps.add(d);
          }
        });
      }
    } else {
      relatedDeps.add(highlight.name);
      files.forEach((f) => {
        if (f.dependencies.includes(highlight.name)) relatedFiles.add(f.name);
      });
    }
  }

  const isFaded = (kind: "file" | "dep", name: string) => {
    if (!highlight) return false;
    if (kind === "file") return !relatedFiles.has(name);
    return !relatedDeps.has(name);
  };

  const isEdgeActive = (fileName: string, depName: string) => {
    if (!highlight) return null;
    const fileMatch = relatedFiles.has(fileName);
    const depMatch = fileNames.has(depName)
      ? relatedFiles.has(
          files.find((x) => stripExt(x.name) === depName)?.name || "",
        )
      : relatedDeps.has(depName);
    return fileMatch && depMatch;
  };

  const handleFileClick = (f: FileEntry) => {
    setHighlight({ type: "file", name: f.name });
    onSelect(f);
  };

  const handleDepClick = (depName: string) => {
    setHighlight({ type: "dep", name: depName });
    // If the dep maps to a known file, open its drawer too.
    const match = files.find((x) => stripExt(x.name) === depName);
    if (match) onSelect(match);
  };

  const handleEdgeClick = (f: FileEntry, depName: string) => {
    setHighlight({ type: "file", name: f.name });
    onSelect(f);
  };

  return (
    <div className="glass rounded-xl p-4 overflow-auto relative">
      {highlight && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-md border border-border bg-background/80 backdrop-blur px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">Highlighting</span>
          <span className="font-mono font-medium">
            {highlight.type === "file" ? stripExt(highlight.name) : highlight.name}
          </span>
          <button
            onClick={() => setHighlight(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}
      <svg width={width} height={height} className="min-w-full">
        {fileNodes.map((node, i) =>
          node.file.dependencies.map((dep, j) => {
            const target = findNode(dep);
            if (!target) return null;
            const active = isEdgeActive(node.file.name, dep);
            const stroke =
              active === true
                ? "hsl(var(--primary) / 0.9)"
                : active === false
                  ? "hsl(var(--primary) / 0.08)"
                  : "hsl(var(--primary) / 0.3)";
            return (
              <line
                key={`${i}-${j}`}
                x1={node.x}
                y1={node.y}
                x2={target.x}
                y2={target.y}
                stroke={stroke}
                strokeWidth={active === true ? 2 : 1}
                className="cursor-pointer"
                onClick={() => handleEdgeClick(node.file, dep)}
              />
            );
          }),
        )}
        {depNodes.map((n, i) => {
          const faded = isFaded("dep", n.name);
          return (
            <g
              key={`d-${i}`}
              className="cursor-pointer"
              onClick={() => handleDepClick(n.name)}
              opacity={faded ? 0.25 : 1}
            >
              <rect
                x={n.x - 80}
                y={n.y - 18}
                width={160}
                height={36}
                rx={8}
                fill="hsl(var(--secondary))"
                stroke={
                  highlight?.type === "dep" && highlight.name === n.name
                    ? "hsl(var(--primary))"
                    : "hsl(var(--border))"
                }
                strokeWidth={highlight?.type === "dep" && highlight.name === n.name ? 2 : 1}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-muted-foreground text-xs font-mono"
              >
                {n.name}
              </text>
            </g>
          );
        })}
        {fileNodes.map((n, i) => {
          const faded = isFaded("file", n.file.name);
          const active = highlight?.type === "file" && highlight.name === n.file.name;
          return (
            <g
              key={`f-${i}`}
              className="cursor-pointer"
              onClick={() => handleFileClick(n.file)}
              opacity={faded ? 0.25 : 1}
            >
              <rect
                x={n.x - 90}
                y={n.y - 22}
                width={180}
                height={44}
                rx={8}
                fill={active ? "hsl(var(--primary) / 0.25)" : "hsl(var(--primary) / 0.1)"}
                stroke={active ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.5)"}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={n.x}
                y={n.y - 4}
                textAnchor="middle"
                className="fill-foreground text-xs font-mono font-medium"
              >
                {n.file.name}
              </text>
              <text
                x={n.x}
                y={n.y + 12}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {n.file.language}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const ExplorePage = () => {
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "graph">("list");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.functions.invoke("vector-list", {
        body: {},
      });
      if (error) throw error;
      const fetched: FileEntry[] = Array.isArray(data?.files) ? data.files : [];
      if (fetched.length === 0) {
        setFiles(mockFiles);
        setUsingMock(true);
      } else {
        setFiles(fetched);
        setUsingMock(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load indexed files";
      setFetchError(msg);
      setFiles(mockFiles);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q),
    );
  }, [query, files]);

  const handleSelect = (f: FileEntry) => {
    setSelected(f);
    setDrawerOpen(true);
  };

  const handleExport = (format: "json" | "csv") => {
    const exportable = filtered.map((f) => ({ name: f.name, path: f.path, language: f.language }));
    if (format === "json") {
      downloadBlob(JSON.stringify(exportable, null, 2), "indexed-files.json", "application/json");
    } else {
      downloadBlob(toCSV(filtered), "indexed-files.csv", "text/csv");
    }
    toast({ title: `Exported ${exportable.length} files`, description: `Format: ${format.toUpperCase()}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Explore Indexed Files</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Browse all indexed files with auto-generated summaries and function listings.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or path..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
                className="rounded-none"
              >
                <List className="w-4 h-4 mr-1.5" /> List
              </Button>
              <Button
                variant={view === "graph" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("graph")}
                className="rounded-none"
              >
                <Network className="w-4 h-4 mr-1.5" /> Graph
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1.5" /> Export list
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("json")}>Download JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>Download CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={loadFiles} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {(fetchError || usingMock) && !loading && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-muted-foreground">
              {fetchError ? (
                <>
                  <span className="font-medium text-foreground">Could not load indexed files: </span>
                  {fetchError}. Showing sample data.
                </>
              ) : (
                <>No indexed files found in the backend yet. Showing sample data — ingest files to see real results.</>
              )}
            </div>
          </div>
        )}

        {view === "graph" ? (
          <GraphView files={filtered} onSelect={handleSelect} />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              {loading ? (
                <div className="glass rounded-lg p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading indexed files...
                </div>
              ) : filtered.length === 0 ? (
                <div className="glass rounded-lg p-6 text-center text-sm text-muted-foreground">
                  No files match "{query}"
                </div>
              ) : (
                filtered.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(file)}
                    className={`w-full text-left glass rounded-lg p-4 transition-all ${
                      selected?.name === file.name ? "border-primary/50" : "hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileCode className="w-4 h-4 text-primary" />
                      <span className="text-sm font-mono font-medium truncate">{file.name}</span>
                    </div>
                    <span className={`text-xs ${langColors[file.language] || "text-muted-foreground"}`}>
                      {file.language}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="md:col-span-2">
              {selected ? (
                <div className="glass rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">{selected.name}</h2>
                    <p className="text-xs font-mono text-muted-foreground mb-3">{selected.path}</p>
                    <p className="text-sm text-muted-foreground">{selected.summary}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Braces className="w-4 h-4 text-primary" /> Functions
                    </h3>
                    <div className="space-y-2">
                      {selected.functions.map((fn, j) => (
                        <div key={j} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                          <Hash className="w-3.5 h-3.5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-medium">{fn.name}</span>
                              <span className="text-xs text-muted-foreground">{fn.lines}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{fn.purpose}</p>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Dependencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.dependencies.map((dep, k) => (
                        <span
                          key={k}
                          className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-md flex items-center gap-1"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-xl p-12 text-center">
                  <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Select a file to view its details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          {selected && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  {selected.name}
                </DrawerTitle>
                <DrawerDescription className="font-mono text-xs">{selected.path}</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 pt-0 overflow-y-auto space-y-5">
                <p className="text-sm text-muted-foreground">{selected.summary}</p>

                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Braces className="w-4 h-4 text-primary" /> Key functions
                  </h3>
                  <div className="space-y-2">
                    {selected.functions.map((fn, j) => (
                      <div key={j} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                        <Hash className="w-3.5 h-3.5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium">{fn.name}</span>
                            <span className="text-xs text-muted-foreground">{fn.lines}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{fn.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Dependencies</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.dependencies.map((dep, k) => (
                      <span
                        key={k}
                        className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-md flex items-center gap-1"
                      >
                        <ChevronRight className="w-3 h-3" />
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ExplorePage;
