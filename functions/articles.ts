import type { PagesFunction } from "@cloudflare/workers-types";
import { DOMParser } from "@xmldom/xmldom";
import sourcesData from "./test-sources.json";

interface Article {
  id: string;
  title: string;
  snippet: string;
  content?: string;
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
          id: link, // Using link as a unique ID
          title,
          snippet: description,
          content: contentEncoded || description, // Use content:encoded if available
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

  // Store full articles in KV
  for (const article of allArticles) {
    await kv.put(`article:${article.id}`, JSON.stringify(article));
  }

  // Store list of articles (without full content) in KV
  const articleList = allArticles.map(({ content, ...rest }) => rest);
  await kv.put("articles_list", JSON.stringify(articleList));

  return new Response(JSON.stringify(articleList), {
    headers: { "Content-Type": "application/json" },
  });
}