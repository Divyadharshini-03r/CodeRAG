import { GitBranch, FileCode, Shield, BarChart3, Languages, ThumbsUp, Eye, Layers } from "lucide-react";

const features = [
  { icon: GitBranch, title: "Dependency Graph", desc: "Visualize function call chains: Controller → Service → Repository → Database." },
  { icon: FileCode, title: "File Summaries", desc: "Auto-generated purpose, key functions, and dependencies for every file." },
  { icon: Eye, title: '"Where is X used?"', desc: "Find all usage points of any function, class, or variable across the entire codebase." },
  { icon: BarChart3, title: "Confidence Scoring", desc: "Every answer shows confidence %, matching file count, and relevance score." },
  { icon: Languages, title: "Multi-Language", desc: "Handle Java, Python, JavaScript, TypeScript — all indexed with language metadata." },
  { icon: ThumbsUp, title: "Feedback Loop", desc: "Rate answers to improve retrieval quality over time with learning signals." },
  { icon: Shield, title: "Access Control", desc: "Restrict sensitive files and admin modules from unauthorized queries." },
  { icon: Layers, title: "Incremental Indexing", desc: "Only re-index changed files for fast updates on large codebases." },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enterprise-Grade <span className="text-gradient-primary">Features</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to make codebases searchable, understandable, and navigable.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <div key={i} className="glass rounded-xl p-5 hover:border-primary/30 transition-all group cursor-default">
              <f.icon className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
