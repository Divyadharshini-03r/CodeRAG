const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BodySchema = z.object({
  query: z.string().min(1).max(2000),
  level: z.enum(["beginner", "intermediate", "expert"]).default("intermediate"),
  topK: z.number().int().min(1).max(20).default(5),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ENDEE_API_KEY = Deno.env.get("ENDEE_API_KEY");
    if (!ENDEE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Vector database API key is not configured.", code: "MISSING_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ENDEE_API_URL = Deno.env.get("ENDEE_API_URL");
    const urlValidationMessage =
      "Vector database URL is invalid. It must be a full https:// base URL (e.g. https://your-host.example.com/api/v1).";
    if (!ENDEE_API_URL) {
      return new Response(
        JSON.stringify({ error: urlValidationMessage, code: "INVALID_API_URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(ENDEE_API_URL);
    } catch {
      return new Response(
        JSON.stringify({ error: urlValidationMessage, code: "INVALID_API_URL", value: ENDEE_API_URL }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (parsedUrl.protocol !== "https:" || !parsedUrl.host) {
      return new Response(
        JSON.stringify({ error: urlValidationMessage, code: "INVALID_API_URL", value: ENDEE_API_URL }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, level, topK } = parsed.data;
    const baseUrl = ENDEE_API_URL.replace(/\/$/, "");
    const indexName = "codebase";
    const t0 = performance.now();
    let embeddingMs = 0;
    let upstreamMs = 0;

    // Step 1: Generate query embedding
    const tEmbStart = performance.now();
    // Try using ENDEE's built-in embedding endpoint first, or fall back to a simple hash vector
    let queryVector: number[];

    try {
      // Attempt to use an OpenAI-compatible embedding API if OPENAI_API_KEY is set
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        const embRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: query, model: "text-embedding-3-small" }),
        });
        if (embRes.ok) {
          const embData = await embRes.json();
          queryVector = embData.data[0].embedding;
        } else {
          console.warn("OpenAI embedding failed, using fallback vector");
          queryVector = generateFallbackVector(query, 1536);
        }
      } else {
        // No OpenAI key — use a deterministic hash-based vector for demo/testing
        console.warn("No OPENAI_API_KEY set, using fallback embedding");
        queryVector = generateFallbackVector(query, 1536);
      }
    } catch (e) {
      console.warn("Embedding generation failed:", e);
      queryVector = generateFallbackVector(query, 1536);
    }

    embeddingMs = Math.round(performance.now() - tEmbStart);

    // Step 2: Query ENDEE.io vector database
    const tUpstreamStart = performance.now();
    const endeeResponse = await fetch(`${baseUrl}/indexes/${indexName}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENDEE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: queryVector,
        topK,
        ef: 128,
        includeVectors: false,
      }),
    });
    upstreamMs = Math.round(performance.now() - tUpstreamStart);

    if (!endeeResponse.ok) {
      const errText = await endeeResponse.text();
      throw new Error(`Vector database query failed [${endeeResponse.status}]: ${errText}`);
    }

    const endeeResults = await endeeResponse.json();
    const matches = endeeResults.results || endeeResults.matches || [];

    // Step 3: Format results
    const files = matches
      .filter((m: Record<string, unknown>) => m.meta)
      .map((m: Record<string, unknown>) => {
        const meta = m.meta as Record<string, string>;
        return {
          path: meta.file_path || meta.path || "unknown",
          snippet: meta.code_snippet || meta.content || meta.text || "",
          lines: meta.lines || meta.line_range || "",
        };
      });

    const contextSnippets = files
      .slice(0, 3)
      .map((f: { path: string; snippet: string }) => `**${f.path}**:\n\`\`\`\n${f.snippet.slice(0, 500)}\n\`\`\``)
      .join("\n\n");

    // Step 4: Generate answer (try OpenAI, fall back to raw snippets)
    let answer: string;
    let confidence = matches.length > 0
      ? Math.round(Math.max(...matches.map((m: Record<string, unknown>) => ((m.score as number) || 0))) * 100)
      : 0;

    const levelPrompt = {
      beginner: "Explain simply, avoid jargon, use analogies.",
      intermediate: "Be clear and technical but accessible.",
      expert: "Be concise and technical. Use precise terminology.",
    }[level];

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey && contextSnippets) {
      try {
        const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a code assistant that answers questions about a codebase using retrieved code snippets. ${levelPrompt} Reference specific files and functions. Be concise.`,
              },
              {
                role: "user",
                content: `Question: ${query}\n\nRelevant code context:\n${contextSnippets}`,
              },
            ],
            max_tokens: 800,
          }),
        });

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          answer = chatData.choices?.[0]?.message?.content || "Could not generate an answer.";
        } else {
          answer = `Found ${matches.length} relevant code snippets:\n\n${contextSnippets}`;
        }
      } catch {
        answer = `Found ${matches.length} relevant code snippets:\n\n${contextSnippets}`;
      }
    } else if (contextSnippets) {
      answer = `Found ${matches.length} relevant code snippets:\n\n${contextSnippets}`;
    } else {
      answer = "No relevant code found for your query. Make sure your codebase has been indexed.";
    }

    const flow = matches
      .slice(0, 6)
      .map((m: Record<string, unknown>) => {
        const meta = m.meta as Record<string, string> | undefined;
        return meta?.function_name || meta?.class_name || "";
      })
      .filter(Boolean);

    if (confidence < 10 && matches.length > 0) confidence = 50;

    return new Response(
      JSON.stringify({
        answer,
        confidence,
        files,
        flow,
        debug: {
          query,
          topK,
          level,
          indexName,
          matchCount: matches.length,
          rawMatches: matches.slice(0, 5),
          timings: {
            totalMs: Math.round(performance.now() - t0),
            embeddingMs,
            upstreamMs,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Vector search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackVector(text: string, dim: number): number[] {
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % dim] += text.charCodeAt(i) / 1000;
  }
  const mag = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0));
  return mag > 0 ? vec.map((v: number) => v / mag) : vec;
}
