import type { PagesFunction } from "@cloudflare/workers-types";

interface Article {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  publicationDatetime: string;
  content?: string;
}

interface Env {
  ARTICLES: KVNamespace;
}

// Fetch article content from the original URL
async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch article content: ${response.status}`);
    }
    
    // For now, return the HTML content
    return await response.text();
  } catch (error) {
    console.error(`Error fetching article content from ${url}:`, error);
    return null;
  }
}

// Handler for /article/[id] endpoint
export const onRequest: PagesFunction<Env> = async (context) => {
  const params = context.params;
  const kv = context.env.ARTICLES;
  
  if (!params || !params.id) {
    return new Response("No ID provided", { status: 400 });
  }
  
  // Get article metadata from KV
  const articleJson = await kv.get(`article:${params.id}`);
  if (!articleJson) {
    return new Response("Article not found", { status: 404 });
  }
  
  const article: Article = JSON.parse(articleJson);
  const content = await fetchArticleContent(article.url);
  
  if (content) {
    article.content = content;
  } else {
    article.content = article.snippet;
  }
  
  return new Response(JSON.stringify(article), { 
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}