interface PagesFunctionContext {
  request: Request;
  env: Record<string, any>;
  params?: Record<string, string>;
}

// Handler for /article/[id] endpoint
export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  const { params, env } = context;
  const kv = env["cloud-rss-articles"];
  if (!params || !params.id) {
    return new Response("No ID provided", { status: 400 });
  }
  const article = await kv.get(`article:${params.id}`);
  if (article) {
    return new Response(article, { headers: { "Content-Type": "application/json" } });
  }
  return new Response("Article not found", { status: 404 });
}