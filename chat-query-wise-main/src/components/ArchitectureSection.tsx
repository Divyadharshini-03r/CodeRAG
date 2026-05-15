const steps = [
  { num: "01", title: "Upload Code", desc: "Push repo via GitHub integration or upload files (Java, Python, JS, TS)." },
  { num: "02", title: "Code-Aware Chunking", desc: "Parse AST → split by functions, classes, methods. Store metadata: file, language, function name." },
  { num: "03", title: "Generate Embeddings", desc: "Convert chunks + docstrings into vector embeddings via ML models." },
  { num: "04", title: "Store in ENDEE.io", desc: "Index vectors in ENDEE.io vector database with metadata filtering support." },
  { num: "05", title: "Hybrid Retrieval", desc: "Combine semantic vector search + keyword BM25 for precise results." },
  { num: "06", title: "Agentic Reasoning", desc: "Multi-step LLM reasoning chains that follow code paths and dependencies." },
];

const ArchitectureSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It <span className="text-gradient-primary">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From raw source code to intelligent answers in six steps.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="glass rounded-xl p-6 hover:border-primary/30 transition-all group relative">
              <span className="text-4xl font-extrabold text-primary/10 absolute top-4 right-4 group-hover:text-primary/20 transition-colors">
                {step.num}
              </span>
              <h3 className="text-base font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
