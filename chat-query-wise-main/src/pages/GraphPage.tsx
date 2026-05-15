import Navbar from "@/components/Navbar";
import { GitBranch } from "lucide-react";

const nodes = [
  { id: "AuthController", x: 50, y: 30, type: "controller" },
  { id: "AuthService", x: 200, y: 30, type: "service" },
  { id: "UserRepository", x: 350, y: 30, type: "repository" },
  { id: "JwtTokenProvider", x: 200, y: 120, type: "util" },
  { id: "BCryptEncoder", x: 350, y: 120, type: "util" },
  { id: "Database", x: 500, y: 75, type: "database" },
];

const edges = [
  { from: "AuthController", to: "AuthService" },
  { from: "AuthService", to: "UserRepository" },
  { from: "AuthService", to: "JwtTokenProvider" },
  { from: "AuthService", to: "BCryptEncoder" },
  { from: "UserRepository", to: "Database" },
];

const typeColors: Record<string, string> = {
  controller: "border-primary bg-primary/10 text-primary",
  service: "border-accent bg-accent/10 text-accent",
  repository: "border-code-function bg-code-function/10 text-code-function",
  util: "border-code-keyword bg-code-keyword/10 text-code-keyword",
  database: "border-code-number bg-code-number/10 text-code-number",
};

const GraphPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Dependency Graph</h1>
          </div>
          <p className="text-muted-foreground text-sm">Visualize how components connect: Controller → Service → Repository → Database.</p>
        </div>

        <div className="glass rounded-xl p-8">
          <div className="relative" style={{ height: 220 }}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 200">
              {edges.map((edge, i) => {
                const from = nodes.find((n) => n.id === edge.from)!;
                const to = nodes.find((n) => n.id === edge.to)!;
                return (
                  <line
                    key={i}
                    x1={from.x + 60}
                    y1={from.y + 20}
                    x2={to.x}
                    y2={to.y + 20}
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                </marker>
              </defs>
            </svg>
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`absolute px-3 py-2 rounded-lg border text-xs font-mono font-medium ${typeColors[node.type]}`}
                style={{ left: node.x, top: node.y }}
              >
                {node.id}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          {Object.entries(typeColors).map(([type, cls]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm border ${cls.split(" ")[0]} ${cls.split(" ")[1]}`} />
              <span className="text-xs text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraphPage;
