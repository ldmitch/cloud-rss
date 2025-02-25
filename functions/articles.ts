import type { PagesFunction } from "@cloudflare/workers-types";
import { DOMParser } from "@xmldom/xmldom";
import sourcesData from "./test-sources.json";

interface Article {
  id: string;
  title: string;
  snippet: string;
  content?: string;
  url: string;
  source: string;
  publicationDatetime: string;
}

interface Source {
  title: string;
  url: string;
}

interface Env {
  ARTICLES: KVNamespace;
}

const sources = sourcesData.sources.map((source: Source) => ({
  name: source.title,
  url: source.url
}));

// Simple hash function to convert URLs to alphanumeric IDs
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to a base36 string (alphanumeric) and ensure it's positive
  return Math.abs(hash).toString(36);
}

// Function to fetch and parse RSS feeds
async function fetchAndParseRSS(url: string, sourceName: string): Promise<Article[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const xmlText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName("parsererror")[0];
    if (parserError) {
      throw new Error(`Failed to parse XML for ${url}: ${parserError.textContent}`);
    }

    const items = xmlDoc.getElementsByTagName("item");
    const articles: Article[] = [];

    for (const item of Array.from(items)) {
      const title = item.getElementsByTagName("title")[0]?.textContent || "";
      const link = item.getElementsByTagName("link")[0]?.textContent || "";
      const description = item.getElementsByTagName("description")[0]?.textContent || "";
      const pubDate = item.getElementsByTagName("pubDate")[0]?.textContent || "";
      // Handle <content:encoded> if present (namespace-aware)
      const contentEncoded = item.getElementsByTagName("encoded")[0]?.textContent || "";

      if (link && title && description && pubDate) {
        articles.push({
          id: hashUrl(link),
          url: link,
          title,
          snippet: description,
          content: contentEncoded || description,
          source: sourceName,
          publicationDatetime: pubDate,
        });
      }
    }

    return articles;

  } catch (error) {
    console.error(`Error processing ${sourceName} (${url}):`, error);
    return []; // Return empty array on failure to continue processing other sources
  }
}

// Handler for /articles endpoint
export const onRequest: PagesFunction<Env> = async (context) => {
  const kv = context.env.ARTICLES;

  const allArticles: Article[] = [];
  for (const source of sources) {
    const articles = await fetchAndParseRSS(source.url, source.name);
    allArticles.push(...articles);
  }

  // Store articles in KV without the content field
  for (const article of allArticles) {
    const { content, ...articleWithoutContent } = article;
    await kv.put(`article:${article.id}`, JSON.stringify(articleWithoutContent));
  }

  // Store list of articles in KV
  const articleList = allArticles.map(({ content, ...rest }) => rest);
  await kv.put("articles_list", JSON.stringify(articleList));

  return new Response(JSON.stringify(articleList), {
    headers: { "Content-Type": "application/json" },
  });
}