import type { Handler, KVNamespace } from '@cloudflare/workers-types';

// Handler for /article/[id] endpoint
export const onRequest: Handler = async (context) => {
  const { params } = context;
  const id = params.id as string;
  const kv = context.env.ARTICLES_KV as KVNamespace;

  // Fetch the article from KV
  const article = await kv.get(`article:${id}`);

  if (!article) {
    return new Response(
      'Article not found',
      { status: 404, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // Return the article as JSON
  return new Response(
    article,
    { headers: { 'Content-Type': 'application/json' } }
  );
};