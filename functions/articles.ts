import Parser from 'rss-parser';
import type { Handler, KVNamespace } from '@cloudflare/workers-types';

interface Article {
  id: string;
  title: string;
  snippet: string;
  content?: string;
  source: string;
  publicationDatetime: string;
}

// Hardcoded RSS sources (could be moved to KV for dynamic updates later)
const sources = [
  { name: "Hacker News", url: "https://hnrss.org/newest" },
  { name: "TypeScript Blog", url: "https://devblogs.microsoft.com/typescript/feed/" },
];

const parser = new Parser();

// Helper function to update articles in KV
async function updateArticles(kv: KVNamespace): Promise<void> {
  const articles: Article[] = [];
  let errorMessage = "";

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      const sourceArticles = feed.items
        .filter(item => item.link && item.title && (item.description || item.contentSnippet) && item.pubDate)
        .map(item => ({
          id: item.link!, // Use link as unique ID
          title: item.title!,
          snippet: item.description || item.contentSnippet || '',
          content: item.content || '', // Full content if available in RSS
          source: source.name,
          publicationDatetime: item.pubDate!, // RFC 2822 format, parsable by JS Date
        }));

      // Store full articles in KV and add to list without content
      for (const article of sourceArticles) {
        await kv.put(`article:${article.id}`, JSON.stringify(article));
        articles.push({ ...article, content: undefined });
      }

    } catch (error) {
      console.error(`Failed to fetch ${source.name}:`, error);
      errorMessage += `Failed to fetch ${source.name}. `;
    }
  }

  // Sort by publication date, most recent first
  articles.sort((a, b) => new Date(b.publicationDatetime).getTime() - new Date(a.publicationDatetime).getTime());

  // Store the list without content and metadata
  await kv.put('articlesList', JSON.stringify({ articles }));
  await kv.put('lastUpdated', Date.now().toString());
  await kv.put('error', errorMessage.trim() || '');
}

// Handler for /articles endpoint
export const onRequest: Handler = async (context) => {
  const kv = context.env.ARTICLES_KV as KVNamespace;

  // Check if cache needs updating (older than 15 minutes)
  const lastUpdated = await kv.get('lastUpdated');
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;
  if (!lastUpdated || now - parseInt(lastUpdated) > fifteenMinutes) {
    await updateArticles(kv);
  }

  // Fetch the cached article list
  const articlesList = await kv.get('articlesList');
  const error = await kv.get('error');

  // Handle case where no articles are cached yet
  if (!articlesList) {
    return new Response(
      JSON.stringify({ articles: [], error: 'No articles found' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse and return the response, including any errors
  const data = JSON.parse(articlesList);
  if (error) {
    data.error = error;
  }

  return new Response(
    JSON.stringify(data),
    { headers: { 'Content-Type': 'application/json' } }
  );
};