import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmbedRequest {
  documentId: string;
}

// ── Text chunking ─────────────────────────────────────────────
function chunkText(text: string, maxChars = 1800, overlapChars = 180): string[] {
  const chunks: string[] = [];
  const sections = text.split(/\n\n+/);
  let current = "";

  for (const section of sections) {
    if ((current + "\n\n" + section).length > maxChars) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = current.slice(-overlapChars) + "\n\n" + section;
      } else {
        // Section alone is too long — split by sentences
        const sentences = section.match(/[^.!?]+[.!?]+/g) || [section];
        for (const sent of sentences) {
          if ((current + sent).length > maxChars) {
            if (current.trim()) chunks.push(current.trim());
            current = current.slice(-overlapChars) + sent;
          } else {
            current += sent;
          }
        }
      }
    } else {
      current += (current ? "\n\n" : "") + section;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 50);
}

// ── Embedding via Azure OpenAI ────────────────────────────────
async function embedAzure(
  text: string,
  key: string,
  endpoint: string,
  deployment: string
): Promise<number[]> {
  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": key },
      // 1536 dims — matches vector(1536) column; HNSW index max is 2000
      body: JSON.stringify({ input: text }),
    }
  );
  if (!res.ok) throw new Error(`Azure embedding error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

// ── Embedding via standard OpenAI ────────────────────────────
async function embedOpenAI(text: string, key: string, model: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: text, model, dimensions: 1536 }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

// ── Embedding dispatcher ──────────────────────────────────────
async function generateEmbedding(text: string): Promise<number[] | null> {
  const azureKey = Deno.env.get("AZURE_OPENAI_KEY");
  const azureEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
  const azureDeployment = Deno.env.get("AZURE_EMBEDDING_DEPLOYMENT") ?? "text-embedding-3-small";
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const openaiModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";

  if (azureKey && azureEndpoint) {
    return await embedAzure(text, azureKey, azureEndpoint, azureDeployment);
  } else if (openaiKey) {
    return await embedOpenAI(text, openaiKey, openaiModel);
  }
  return null; // No AI key configured — store chunks only
}

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({ success: false, error: { code: "UNAUTHORIZED", message: "Missing Authorization header" } }, 401);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is admin, hse_manager, or hse_advisor
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return respond({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
    }
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || !["admin", "hse_manager", "hse_advisor"].includes(profile.role)) {
      return respond({ success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, 403);
    }

    const body = await req.json() as EmbedRequest;
    if (!body.documentId) {
      return respond({ success: false, error: { code: "VALIDATION_ERROR", message: "documentId is required" } }, 400);
    }

    // Fetch document content from DB (already stored as text)
    const { data: doc, error: docError } = await adminClient
      .from("knowledge_documents")
      .select("id, title, document_code, content, status")
      .eq("id", body.documentId)
      .maybeSingle();

    if (docError || !doc) {
      return respond({ success: false, error: { code: "NOT_FOUND", message: "Document not found" } }, 404);
    }

    const textToEmbed = [doc.title, doc.document_code, doc.content].filter(Boolean).join("\n\n");

    if (!textToEmbed || textToEmbed.trim().length < 30) {
      // Mark as indexed with no content so we don't retry empty docs
      await adminClient
        .from("knowledge_documents")
        .update({ embedding_status: "skipped" })
        .eq("id", body.documentId);
      return respond({ success: false, error: { code: "VALIDATION_ERROR", message: "Document has no content to embed" } }, 400);
    }

    // Mark as processing
    await adminClient
      .from("knowledge_documents")
      .update({ embedding_status: "processing" })
      .eq("id", body.documentId);

    // Delete existing chunks for clean re-ingestion
    await adminClient.from("document_chunks").delete().eq("document_id", body.documentId);

    const chunks = chunkText(textToEmbed);
    let savedChunks = 0;
    let savedEmbeddings = 0;
    const embeddingAvailable = !!(
      (Deno.env.get("AZURE_OPENAI_KEY") && Deno.env.get("AZURE_OPENAI_ENDPOINT")) ||
      Deno.env.get("OPENAI_API_KEY")
    );

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];

      // Detect section heading from first line if it looks like a heading
      const lines = content.split("\n");
      const firstLine = lines[0].trim();
      const sectionHeading = (firstLine.length < 120 && !firstLine.endsWith("."))
        ? firstLine
        : null;

      const { data: chunk, error: chunkError } = await adminClient
        .from("document_chunks")
        .insert({
          document_id: body.documentId,
          chunk_index: i,
          content,
          section_heading: sectionHeading,
          metadata: { chunk_length: content.length, total_chunks: chunks.length },
        })
        .select("id")
        .maybeSingle();

      if (chunkError || !chunk) {
        console.error(`Chunk ${i} save error:`, chunkError?.message);
        continue;
      }
      savedChunks++;

      // Generate and store embedding if AI key is available
      if (embeddingAvailable) {
        try {
          const embedding = await generateEmbedding(content);
          if (embedding) {
            const { error: embError } = await adminClient.from("embeddings").insert({
              chunk_id: chunk.id,
              embedding: `[${embedding.join(",")}]`,
              model: Deno.env.get("AZURE_OPENAI_KEY")
                ? (Deno.env.get("AZURE_EMBEDDING_DEPLOYMENT") ?? "text-embedding-3-small")
                : (Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small"),
            });
            if (!embError) savedEmbeddings++;
          }
        } catch (embErr) {
          console.error(`Embedding chunk ${i} error:`, embErr);
        }
      }
    }

    // Update embedding_status — "indexed" if chunks saved, "embedded" if embeddings saved
    const finalStatus = savedEmbeddings > 0
      ? "embedded"
      : savedChunks > 0
      ? "indexed"
      : "failed";

    await adminClient
      .from("knowledge_documents")
      .update({ embedding_status: finalStatus })
      .eq("id", body.documentId);

    return respond({
      success: true,
      data: {
        documentId: body.documentId,
        chunksCreated: savedChunks,
        embeddingsCreated: savedEmbeddings,
        embeddingStatus: finalStatus,
        aiAvailable: embeddingAvailable,
        message: embeddingAvailable
          ? `Document indexed and embedded (${savedEmbeddings} vectors).`
          : `Document chunked (${savedChunks} chunks). Add AZURE_OPENAI_KEY or OPENAI_API_KEY secrets to enable vector search.`,
      },
    });
  } catch (err) {
    console.error("embed-document error:", err);
    return respond({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, 500);
  }
});
