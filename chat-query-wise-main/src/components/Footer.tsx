import { Code2, Sparkles } from "lucide-react";
import { useAttribution } from "@/hooks/useAttribution";

const Footer = () => {
  const { showAttribution } = useAttribution();

  return (
    <footer className="border-t border-border py-12">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              Code<span className="text-primary">RAG</span>
            </span>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary"
            aria-label="RAG-powered code understanding"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>RAG-powered code understanding</span>
          </div>

          {showAttribution ? (
            <p className="text-xs text-muted-foreground">
              Powered by CodeRAG
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Semantic search for your codebase
            </p>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
