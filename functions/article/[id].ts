import { SingleArticleResponse } from '../types';
import { XMLParser } from 'fast-xml-parser';

// Simple HTML parsing and cleaning without JSDOM
function extractArticleContent(html: string): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
    htmlEntities: true
  });

  try {
    const parsed = parser.parse(html);
    const article = findArticleContent(parsed);
    return cleanAndFormatHTML(article);
  } catch (error) {
    // If XML parsing fails (due to invalid HTML), fall back to basic content extraction
    return extractContentFallback(html);
  }
}

function findArticleContent(parsed: any): string {
  // Try to find the main article content in common locations
  const possibleContent = [
    parsed?.html?.body?.article,
    parsed?.html?.body?.main,
    parsed?.html?.body?.['article-content'],
    parsed?.html?.body?.content,
    parsed?.html?.body
  ].find(x => x);

  return JSON.stringify(possibleContent || parsed?.html?.body || '');
}

function cleanAndFormatHTML(content: string): string {
  // Basic cleaning - remove scripts, styles, etc
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function extractContentFallback(html: string): string {
  // Very basic fallback extractor
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html;
  return cleanAndFormatHTML(body);
}

export const onRequestGet: PagesFunction<{Params: {id: string}}> = async ({params}) => {
  try {
    // Decode the ID to get the original URL components
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const idString = atob(id);
    const [originalUrl] = idString.split('|');

    if (!originalUrl) {
      throw new Error('Invalid article ID');
    }

    // Fetch the article
    const articleResponse = await fetch(originalUrl);
    if (!articleResponse.ok) {
      throw new Error(`Failed to fetch article: ${articleResponse.status}`);
    }

    const html = await articleResponse.text();
    const content = extractArticleContent(html);

    const apiResponse: SingleArticleResponse = { content };
    return new Response(JSON.stringify(apiResponse), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    const apiResponse: SingleArticleResponse = {
      content: '',
      error: `Failed to fetch article content: ${error instanceof Error ? error.message : String(error)}`
    };

    return new Response(JSON.stringify(apiResponse), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}