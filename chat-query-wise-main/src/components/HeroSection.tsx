import { ArrowRight, Brain, Database, Search } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      <div className="container relative z-10 px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 max-w-4xl mx-auto">
          Understand Any{" "}
          <span className="text-gradient-primary">Codebase</span>{" "}
          Instantly
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your code, build intelligent embeddings, and ask questions in natural language. 
          RAG-powered code comprehension with dependency graphs and agentic reasoning.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link
            to="/chat"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all glow-primary"
          >
            Start Exploring
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border bg-secondary text-secondary-foreground font-semibold text-base hover:bg-muted transition-all"
          >
            View Demo
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Brain, title: "Agentic RAG", desc: "Multi-step reasoning that understands query intent, searches functions, comments, and configs intelligently." },
            { icon: Database, title: "Code-Aware Chunking", desc: "Splits by functions, classes, and methods — not arbitrary text. Stores rich metadata for precise retrieval." },
            { icon: Search, title: "Hybrid Search", desc: "Combines vector similarity with keyword matching for exact function names and semantic meaning." },
          ].map((feature, i) => (
            <div key={i} className="glass rounded-2xl p-6 text-left hover:border-primary/30 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
