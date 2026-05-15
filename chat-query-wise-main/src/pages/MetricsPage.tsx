import Navbar from "@/components/Navbar";
import { BarChart3, Database, FileCode, Zap } from "lucide-react";

const stats = [
  { label: "Files Indexed", value: "847", icon: FileCode },
  { label: "Functions Mapped", value: "3,241", icon: Zap },
  { label: "Vectors Stored", value: "12,847", icon: Database },
  { label: "Avg Query Time", value: "45ms", icon: BarChart3 },
];

const MetricsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Metrics</h1>
          </div>
          <p className="text-muted-foreground text-sm">Overview of indexing and search performance.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <s.icon className="w-5 h-5 text-primary mb-3" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4">Language Distribution</h3>
          <div className="space-y-3">
            {[
              { lang: "Java", pct: 42, color: "bg-code-function" },
              { lang: "Python", pct: 28, color: "bg-code-string" },
              { lang: "TypeScript", pct: 20, color: "bg-primary" },
              { lang: "JavaScript", pct: 10, color: "bg-code-number" },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{item.lang}</span>
                  <span className="text-muted-foreground">{item.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage;
