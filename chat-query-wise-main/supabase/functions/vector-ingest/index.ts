const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const FileSchema = z.object({
  id: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  file_path: z.string().min(1).max(1000),
  language: z.string().min(1).max(50),
  function_name: z.string().optional(),
  class_name: z.string().optional(),
  lines: z.string().optional(),
});

const BodySchema = z.object({
  files: z.array(FileSchema).min(1).max(100),
  indexName: z.string().min(1).max(100).default("codebase"),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ENDEE_API_KEY = Deno.env.get("ENDEE_API_KEY");
    if (!ENDEE_API_KEY) {
      throw new Error("ENDEE_API_KEY is not configured");
    }

    const ENDEE_API_URL = Deno.env.get("ENDEE_API_URL");
    if (!ENDEE_API_URL) {
      throw new Error("ENDEE_API_URL is not configured");
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { files, indexName } = parsed.data;
    const baseUrl = ENDEE_API_URL.replace(/\/$/, "");

    // Step 1: Ensure index exists (try to create, ignore if exists)
    const dimension = 1536; // text-embedding-3-small dimension
    try {
      await fetch(`${baseUrl}/indexes`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENDEE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: indexName,
          dimension,
          spaceType: "cosine",
          precision: "INT8",
        }),
      });
    } catch {
      // Index may already exist, continue
    }

    // Step 2: Generate embeddings and upsert vectors
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const vectors = [];

    for (const file of files) {
      const textToEmbed = `${file.file_path}\n${file.function_name || ""}\n${file.content}`;
      let vector: number[];

      if (openaiKey) {
        try {
          const embRes = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: textToEmbed.slice(0, 8000), model: "text-embedding-3-small" }),
          });
          if (embRes.ok) {
            const embData = await embRes.json();
            vector = embData.data[0].embedding;
          } else {
            vector = generateFallbackVector(textToEmbed, dimension);
          }
        } catch {
          vector = generateFallbackVector(textToEmbed, dimension);
        }
      } else {
        vector = generateFallbackVector(textToEmbed, dimension);
      }

      vectors.push({
        id: file.id,
        vector,
        meta: {
          file_path: file.file_path,
          language: file.language,
          function_name: file.function_name || "",
          class_name: file.class_name || "",
          lines: file.lines || "",
          code_snippet: file.content.slice(0, 2000),
          content: file.content,
        },
        filter: {
          language: file.language,
        },
      });
    }

    // Upsert in batches of 100 (ENDEE max is 1000)
    const batchSize = 100;
    let totalUpserted = 0;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const upsertRes = await fetch(`${baseUrl}/indexes/${indexName}/vectors`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENDEE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!upsertRes.ok) {
        const errText = await upsertRes.text();
        throw new Error(`ENDEE.io upsert failed [${upsertRes.status}]: ${errText}`);
      }
      totalUpserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, upserted: totalUpserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Ingest error:", error);
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
