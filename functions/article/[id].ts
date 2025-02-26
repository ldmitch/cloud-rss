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

// Extract the base URL from a full URL
function getBaseUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return '';
  }
}

// Resolve relative URLs to absolute ones
function resolveRelativeUrls(html: string, baseUrl: string): string {
  if (!baseUrl) return html;
  
  try {
    const { document } = parseHTML(`<div>${html}</div>`);
    
    // Process all anchor tags
    const links = document.querySelectorAll('a');
    links.forEach((link: Element) => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Only process relative URLs
      if (href.startsWith('/') && !href.startsWith('//')) {
        link.setAttribute('href', `${baseUrl}${href}`);
      } else if (!href.includes('://') && !href.startsWith('#') && !href.startsWith('mailto:')) {
        // Handle links without leading slash
        link.setAttribute('href', `${baseUrl}/${href}`);
      }
    });
    
    // Process all images too
    const images = document.querySelectorAll('img');
    images.forEach((img: Element) => {
      const src = img.getAttribute('src');
      if (!src) return;
      
      if (src.startsWith('/') && !src.startsWith('//')) {
        img.setAttribute('src', `${baseUrl}${src}`);
      } else if (!src.includes('://')) {
        // Handle images without leading slash
        img.setAttribute('src', `${baseUrl}/${src}`);
      }
    });
    
    // Return the inner HTML of the wrapper div, not the whole body
    return document.querySelector('div').innerHTML;
  } catch (error) {
    console.error('Error resolving relative URLs:', error);
    return html; // Return the original HTML if there's an error
  }
}

// Extract clean text from HTML content
function extractArticleContent(html: string, baseUrl: string): string {
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
    const contentHtml = contentElement.innerHTML;
    return resolveRelativeUrls(contentHtml, baseUrl);
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
    const baseUrl = getBaseUrl(url);
    return extractArticleContent(htmlContent, baseUrl);
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