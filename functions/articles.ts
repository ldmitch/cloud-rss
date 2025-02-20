import { XMLParser } from 'fast-xml-parser';
import { subHours, parseISO, isValid } from 'date-fns';
import { Article, RSSArticleResponse, RSSFeed, RSSSource } from './types';

async function fetchRSSFeed(source: RSSSource): Promise<{ articles: Article[], error?: string }> {
  try {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const xml = await response.text();
    const parser = new XMLParser();
    const feed = parser.parse(xml) as RSSFeed;

    const twoHoursAgo = subHours(new Date(), 2);
    const articles = feed.rss.channel.item
      .map(item => {
        const pubDate = parseISO(item.pubDate);
        if (!isValid(pubDate) || pubDate < twoHoursAgo) {
          return null;
        }

        // Create deterministic ID from GUID and pubDate
        const idString = `${item.guid || item.link}|${item.pubDate}`;
        const id = btoa(idString).replace(/[/+=]/g, '');

        return {
          id,
          title: item.title,
          link: item.link,
          description: item.description,
          snippet: item.description.substring(0, 100) + '...',
          publicationDatetime: pubDate.toISOString(),
          source: source.name
        };
      })
      .filter((article): article is Article => article !== null);

    return { articles };
  } catch (error) {
    return {
      articles: [],
      error: `Error fetching ${source.name}: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export const onRequestGet: PagesFunction = async () => {
  try {
    // Read sources file
    const sourcesModule = await import('./limited-sources.json');
    const sources: RSSSource[] = sourcesModule.sources;

    // Fetch all feeds in parallel
    const feedResults = await Promise.all(
      sources.map(source => fetchRSSFeed(source))
    );

    // Combine and sort all articles
    const articles = feedResults
      .flatMap(result => result.articles)
      .sort((a, b) => 
        new Date(b.publicationDatetime).getTime() - new Date(a.publicationDatetime).getTime()
      );

    // Collect any errors
    const errors = feedResults
      .map(result => result.error)
      .filter((error): error is string => !!error);

    const response: RSSArticleResponse = {
      articles,
      ...(errors.length > 0 && { error: errors.join('; ') })
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      status: errors.length > 0 ? 206 : 200
    });
  } catch (error) {
    const response: RSSArticleResponse = {
      articles: [],
      error: `Server error: ${error instanceof Error ? error.message : String(error)}`
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}