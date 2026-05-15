import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Send, GraduationCap, AlertCircle, Bug, Settings as SettingsIcon, Copy, X, ExternalLink } from "lucide-react";
import ChatMessage from "@/components/chat/ChatMessage";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ExplanationLevel = "beginner" | "intermediate" | "expert";

interface ChatFile {
  path: string;
  snippet: string;
  lines: string;
}

interface DebugInfo {
  query: string;
  topK: number;
  level: ExplanationLevel;
  indexName?: string;
  matchCount?: number;
  rawMatches?: unknown[];
  durationMs?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  files?: ChatFile[];
  flow?: string[];
  isNew?: boolean;
  error?: boolean;
  errorCode?: string;
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        'Welcome! Ask me anything about your indexed codebase — try "What are the API endpoints?" or "How is security configured?"',
      confidence: 100,
    },
  ]);
  const [input, setInput] = useState("");
  const [level, setLevel] = useState<ExplanationLevel>("intermediate");
  const [isTyping, setIsTyping] = useState(false);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugDismissed, setDebugDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("chat-debug-dismissed") === "1";
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-rerun the last "configuration test ping" action on reload, if it was the last one issued
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("chat-last-action") === "test-ping") {
      // small delay so the UI mounts cleanly
      const id = setTimeout(() => send("configuration test ping"), 250);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (overrideQuery?: string) => {
    const query = (overrideQuery ?? input).trim();
    if (!query || isTyping) return;
    const userMsg: Message = { role: "user", content: query, isNew: true };

    setMessages((prev) => [...prev.map((m) => ({ ...m, isNew: false })), userMsg]);
    if (!overrideQuery) {
      setInput("");
      if (typeof window !== "undefined") localStorage.removeItem("chat-last-action");
    }
    setIsTyping(true);

    const requestBody = { query, level, topK: 5 };
    const startedAt = performance.now();

    try {
      const { data, error } = await supabase.functions.invoke("vector-search", {
        body: requestBody,
      });

      const durationMs = Math.round(performance.now() - startedAt);

      if (error) {
        // Try to extract structured error from the function response
        let payload: { error?: string; code?: string } = {};
        try {
          payload = (error as unknown as { context?: { body?: string } }).context?.body
            ? JSON.parse((error as unknown as { context: { body: string } }).context.body)
            : {};
        } catch {
          // ignore parse errors
        }
        throw Object.assign(new Error(payload.error || error.message || "Request failed"), {
          code: payload.code,
        });
      }

      setDebug({
        query,
        topK: 5,
        level,
        indexName: data?.debug?.indexName,
        matchCount: data?.debug?.matchCount,
        rawMatches: data?.debug?.rawMatches,
        durationMs,
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer || "No relevant results found for your query.",
        confidence: data.confidence ?? 0,
        files: data.files || [],
        flow: data.flow || [],
        isNew: true,
      };

      setMessages((prev) => [...prev.map((m) => ({ ...m, isNew: false })), assistantMsg]);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      const errorMessage = e.message || "Something went wrong while searching.";
      const errorCode = e.code;
      setDebug({ query, topK: 5, level, durationMs: Math.round(performance.now() - startedAt) });
      // Auto-open debug panel on configuration errors (override prior dismissal)
      if (errorCode === "INVALID_API_URL" || errorCode === "MISSING_API_KEY") {
        setShowDebug(true);
        setDebugDismissed(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("chat-debug-dismissed");
        }
      }
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, isNew: false })),
        {
          role: "assistant",
          content: errorMessage,
          isNew: true,
          error: true,
          errorCode,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col pt-16 max-w-4xl mx-auto w-full">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((msg, i) =>
            msg.error ? (
              <div
                key={i}
                className="flex gap-3 animate-fade-in rounded-xl border border-destructive/30 bg-destructive/5 p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Vector search failed
                  </p>
                  <p className="text-sm text-muted-foreground">{msg.content}</p>
                  {msg.errorCode === "INVALID_API_URL" || msg.errorCode === "MISSING_API_KEY" ? (
                    <Link
                      to="/settings"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      Open Settings to fix configuration
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <ChatMessage key={i} {...msg} />
            )
          )}
          {isTyping && <TypingIndicator />}

          {debug && !debugDismissed && (
            <div className="rounded-xl border border-border bg-card/50">
              <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground">
                <button
                  onClick={() => setShowDebug((s) => !s)}
                  className="flex-1 flex items-center gap-2 text-left hover:text-foreground"
                >
                  <Bug className="w-3.5 h-3.5" />
                  Debug: last vector search
                  {typeof debug.matchCount === "number" && (
                    <span className="text-muted-foreground/70">
                      · {debug.matchCount} matches · {debug.durationMs}ms
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <Link
                    to="/settings#test-results"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary hover:text-foreground"
                    title="Open Settings → timing & matches"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(JSON.stringify(debug, null, 2));
                      toast.success("Debug JSON copied");
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary hover:text-foreground"
                    title="Copy debug JSON"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button
                    onClick={() => setShowDebug((s) => !s)}
                    className="px-2 py-1 rounded hover:bg-secondary hover:text-foreground"
                  >
                    {showDebug ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => {
                      setDebugDismissed(true);
                      setShowDebug(false);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("chat-debug-dismissed", "1");
                      }
                    }}
                    className="p-1 rounded hover:bg-secondary hover:text-foreground"
                    title="Dismiss debug panel (remembered)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {showDebug && (
                <div className="px-4 pb-4 space-y-3 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">Request</div>
                    <pre className="bg-muted/40 rounded-md p-2 overflow-x-auto">
{JSON.stringify(
  { query: debug.query, topK: debug.topK, level: debug.level, indexName: debug.indexName },
  null,
  2
)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">
                      Top retrieved chunks ({debug.rawMatches?.length ?? 0})
                    </div>
                    <pre className="bg-muted/40 rounded-md p-2 overflow-x-auto max-h-64">
{JSON.stringify(debug.rawMatches ?? [], null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Explain like:</span>
            {(["beginner", "intermediate", "expert"] as ExplanationLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  level === l
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-center glass rounded-xl px-4 py-2">
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder='Ask about your codebase... e.g. "Where is authentication handled?"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={isTyping}
            />
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("chat-last-action", "test-ping");
                }
                send("configuration test ping");
              }}
              disabled={isTyping}
              className="px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30"
              title="Run configuration test ping"
            >
              Test
            </button>
            <button
              onClick={() => send()}
              disabled={!input.trim() || isTyping}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
