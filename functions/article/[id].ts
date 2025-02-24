import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  ARTICLES: KVNamespace;
}

// Handler for /article/[id] endpoint
export const onRequest: PagesFunction<Env> = async (context) => {
  const params = context.params;
  const kv = context.env.ARTICLES;
  
  if (!params || !params.id) {
    return new Response("No ID provided", { status: 400 });
  }
  const article = await kv.get(`article:${params.id}`);
  if (article) {
    return new Response(article, { headers: { "Content-Type": "application/json" } });
  }
  return new Response("Article not found", { status: 404 });
}