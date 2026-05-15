import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { Upload, Github, FileCode, X, Check, FolderOpen, Loader2 } from "lucide-react";

interface UploadedFile {
  name: string;
  size: string;
  language: string;
  status: "uploading" | "indexed" | "error";
}

const langMap: Record<string, string> = {
  java: "Java", py: "Python", ts: "TypeScript", tsx: "TypeScript", js: "JavaScript",
  jsx: "JavaScript", go: "Go", rs: "Rust", cpp: "C++", c: "C", rb: "Ruby",
};

const detectLang = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return langMap[ext] || "Unknown";
};

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

const UploadPage = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      name: f.name,
      size: formatSize(f.size),
      language: detectLang(f.name),
      status: "uploading" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((_, i) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, j) => (j === prev.length - newFiles.length + i ? { ...f, status: "indexed" } : f))
        );
      }, 1000 + i * 500);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const connectGithub = () => {
    if (!repoUrl.trim()) return;
    setConnecting(true);
    setTimeout(() => {
      setFiles((prev) => [
        ...prev,
        { name: "AuthService.java", size: "4.2 KB", language: "Java", status: "indexed" },
        { name: "UserRepository.java", size: "2.1 KB", language: "Java", status: "indexed" },
        { name: "app.py", size: "8.7 KB", language: "Python", status: "indexed" },
        { name: "config.ts", size: "1.3 KB", language: "TypeScript", status: "indexed" },
      ]);
      setConnecting(false);
      setRepoUrl("");
    }, 2000);
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Upload Code</h1>
          </div>
          <p className="text-muted-foreground text-sm">Drag & drop source files or connect a GitHub repository for indexing.</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`glass rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer mb-8 ${
            dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files?.length) handleFiles(target.files);
            };
            input.click();
          }}
        >
          <FolderOpen className={`w-12 h-12 mx-auto mb-4 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium mb-1">
            {dragging ? "Drop files here" : "Drag & drop source files here"}
          </p>
          <p className="text-xs text-muted-foreground">
            Supports Java, Python, TypeScript, JavaScript, Go, Rust, C++, Ruby
          </p>
        </div>

        <div className="glass rounded-xl border border-border/50 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Github className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold">Connect GitHub Repository</h3>
          </div>
          <div className="flex gap-3">
            <input
              className="flex-1 bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50 placeholder:text-muted-foreground"
              placeholder="https://github.com/user/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connectGithub()}
            />
            <button
              onClick={connectGithub}
              disabled={connecting || !repoUrl.trim()}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              {connecting ? "Indexing..." : "Connect"}
            </button>
          </div>
        </div>

        {files.length > 0 && (
          <div className="glass rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{files.length} file{files.length !== 1 && "s"} indexed</h3>
              <span className="text-xs text-muted-foreground font-mono">
                {files.filter((f) => f.status === "indexed").length} ready
              </span>
            </div>
            <div className="divide-y divide-border/30">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                  <FileCode className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-mono flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{file.language}</span>
                  <span className="text-xs text-muted-foreground">{file.size}</span>
                  {file.status === "uploading" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                  {file.status === "indexed" && <Check className="w-4 h-4 text-accent" />}
                  <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
