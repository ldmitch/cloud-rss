import type { PagesFunction } from "@cloudflare/workers-types";
import { parseHTML } from "linkedom";

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

// Extract clean text from HTML content
function extractArticleContent(html: string): string {
  try {
    const { document } = parseHTML(html);
    
    // Remove unwanted elements that typically don't contain article content
    const elementsToRemove = [
      'script', 'style', 'nav', 'header', 'footer', 
      'aside', 'iframe', 'noscript', 'svg', 'form',
      'button', '.ad', '.advertisement', '.social-share',
      '.related-articles', '.sidebar', '.comments'
    ];
    
    elementsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        el.remove();
      }
    });
    
    // Look for typical article content containers
    const possibleContentElements = [
      document.querySelector("article"),
      document.querySelector("main"),
      document.querySelector(".article-content"),
      document.querySelector(".post-content"),
      document.querySelector(".entry-content"),
      document.querySelector("#content"),
      document.querySelector(".content")
    ].filter(Boolean);
    
    let contentElement = possibleContentElements[0] || document.body;
    let cleanContent = '';
    
    // Process paragraphs and headers for a cleaner output
    const paragraphs = contentElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const text = p.textContent?.trim() || '';
      if (text.length > 20) { // Skip very short paragraphs which are likely not content
        cleanContent += text + '\n\n';
      }
    }
    
    if (!cleanContent.trim()) {
      // Fall back to body content if no paragraphs were found
      cleanContent = contentElement.textContent?.trim() || '';
    }
    
    return cleanContent.trim();
  } catch (error) {
    console.error('Error extracting article content:', error);
    return 'Failed to extract article content.';
  }
}

// Fetch article content from the original URL
async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch article content: ${response.status}`);
    }
    
    const htmlContent = await response.text();
    return extractArticleContent(htmlContent);
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