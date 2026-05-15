import { Bot, User, FileCode, ThumbsUp, ThumbsDown } from "lucide-react";

interface ChatFile {
  path: string;
  snippet: string;
  lines: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  files?: ChatFile[];
  flow?: string[];
  isNew?: boolean;
}

const confidenceColor = (c: number) =>
  c >= 80 ? "text-confidence-high" : c >= 50 ? "text-confidence-medium" : "text-confidence-low";

const ChatMessage = ({ role, content, confidence, files, flow, isNew }: ChatMessageProps) => (
  <div className={`flex gap-3 ${role === "user" ? "justify-end" : ""} ${isNew ? "animate-fade-in" : ""}`}>
    {role === "assistant" && (
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
        <Bot className="w-4 h-4 text-primary" />
      </div>
    )}
    <div className={`max-w-2xl ${role === "user" ? "bg-secondary rounded-2xl rounded-br-md px-5 py-3" : ""}`}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

      {files && files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((f, j) => (
            <div key={j} className="code-block overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border text-xs text-muted-foreground">
                <FileCode className="w-3.5 h-3.5" />
                <span className="font-mono">{f.path}</span>
                <span className="ml-auto">{f.lines}</span>
              </div>
              <pre className="px-4 py-3 text-xs overflow-x-auto">
                <code>{f.snippet}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {flow && (
        <div className="mt-4 glass rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Call Flow</p>
          <div className="flex items-center gap-2 flex-wrap">
            {flow.map((step, k) => (
              <span key={k} className="flex items-center gap-2">
                <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-md">{step}</span>
                {k < flow.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {role === "assistant" && confidence !== undefined && (
        <div className="mt-3 flex items-center gap-4">
          <span className={`text-xs font-mono font-semibold ${confidenceColor(confidence)}`}>
            {confidence}% confidence
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-accent transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
    {role === "user" && (
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
        <User className="w-4 h-4 text-muted-foreground" />
      </div>
    )}
  </div>
);

export default ChatMessage;
