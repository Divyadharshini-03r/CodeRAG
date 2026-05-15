const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndexedFile {
  id: string;
  name: string;
  path: string;
  language: string;
  summary: string;
  functions: { name: string; lines: string; purpose: string }[];
  dependencies: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ENDEE_API_KEY = Deno.env.get("ENDEE_API_KEY");
    if (!ENDEE_API_KEY) throw new Error("ENDEE_API_KEY is not configured");

    const ENDEE_API_URL = Deno.env.get("ENDEE_API_URL");
    if (!ENDEE_API_URL) throw new Error("ENDEE_API_URL is not configured");

    const url = new URL(req.url);
    const indexName = url.searchParams.get("indexName") || "codebase";
    const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 1000);
    const baseUrl = ENDEE_API_URL.replace(/\/$/, "");

    // ENDEE.io: list vectors in the index
    const listRes = await fetch(
      `${baseUrl}/indexes/${encodeURIComponent(indexName)}/vectors?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ENDEE_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`ENDEE.io list failed [${listRes.status}]: ${errText}`);
    }

    const data = await listRes.json();
    const rawVectors: any[] = Array.isArray(data) ? data : data.vectors || data.data || [];

    // Group by file_path so multiple chunks per file collapse to a single entry
    const fileMap = new Map<string, IndexedFile>();

    for (const v of rawVectors) {
      const meta = v.meta || v.metadata || {};
      const path: string = meta.file_path || v.id || "unknown";
      const language: string = meta.language || "Unknown";
      const fnName: string = meta.function_name || "";
      const lines: string = meta.lines || "";
      const snippet: string = meta.code_snippet || meta.content || "";
      const className: string = meta.class_name || "";

      const name = path.split("/").pop() || path;
      let entry = fileMap.get(path);
      if (!entry) {
        entry = {
          id: path,
          name,
          path,
          language,
          summary: className
            ? `${className} — ${language} module at ${path}`
            : `${language} module at ${path}`,
          functions: [],
          dependencies: [],
        };
        fileMap.set(path, entry);
      }

      if (fnName) {
        const purpose = snippet
          ? snippet.replace(/\s+/g, " ").slice(0, 120)
          : "Indexed function";
        entry.functions.push({ name: fnName, lines: lines || "", purpose });
      }
    }

    const files = Array.from(fileMap.values());

    return new Response(
      JSON.stringify({ files, total: files.length, indexName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("List error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, files: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
