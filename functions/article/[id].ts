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
  sourceUrl: string;
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

    // Fix problematic images
    const images = document.querySelectorAll('img');
    images.forEach((img: Element) => {
      if (img.hasAttribute('data-nimg')) {
        img.removeAttribute('data-nimg');
      }
      if (img.hasAttribute('style')) {
        const style = img.getAttribute('style') || '';
        if (style.includes('position:absolute') || style.includes('position: absolute')) {
          img.removeAttribute('style');
        }
      }
      if (img.hasAttribute('srcset')) {
        img.removeAttribute('srcset');
      }

      // Make sure images have reasonable max dimensions
      img.setAttribute('style', 'max-width: 100%; height: auto; position: static;');
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

// Fetch article content from RSS/ATOM feed
async function fetchArticleContentFromFeed(article: Article): Promise<string | null> {
  try {
    const url = article.url;
    const sourceUrl = article.sourceUrl;

    console.log(`Fetching content from feed: ${sourceUrl}`);
    console.log(`Looking for article with URL: ${url}`);

    const response = await fetch(sourceUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status}`);
    }

    const xmlContent = await response.text();
    console.log(`Feed fetched successfully, size: ${xmlContent.length} bytes`);

    const { document } = parseHTML(xmlContent);

    // Handle both RSS and Atom feeds
    const items = document.querySelectorAll('item, entry');
    console.log(`Found ${items.length} items in the feed`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Extract link using multiple approaches
      let link = '';

      // Approach 1: Try to get link directly from the item's outerHTML
      const itemHtml = item.outerHTML || '';
      const linkRegex = /<link[^>]*?>([^<]*)<\/link>|<link[^>]*?>([^<]*)/i;
      const linkMatch = itemHtml.match(linkRegex);

      if (linkMatch && (linkMatch[1] || linkMatch[2])) {
        link = (linkMatch[1] || linkMatch[2] || '').trim();
        console.log(`Found link using regex: ${link}`);
      }

      // Approach 2: Traditional querySelector approach
      else {
        const linkElement = item.querySelector('link');
        if (linkElement) {
          // Try getting the text content
          if (linkElement.textContent && linkElement.textContent.trim()) {
            link = linkElement.textContent.trim();
            console.log(`Found link (text content): ${link}`);
          }
          // Try getting href attribute (for Atom feeds)
          else if (linkElement.getAttribute('href')) {
            link = linkElement.getAttribute('href').trim();
            console.log(`Found link (href attribute): ${link}`);
          }
          // Last resort: get the innerHTML
          else {
            const rawHtml = linkElement.outerHTML || '';
            const innerMatch = rawHtml.match(/>([^<]*)</);
            if (innerMatch && innerMatch[1]) {
              link = innerMatch[1].trim();
              console.log(`Found link (extracted from raw HTML): ${link}`);
            }
          }
        }
      }
      console.log(`Link found: ${link}`);

      // Normalize URLs for comparison (remove trailing slashes)
      const normalizeUrl = (url: string) => url.replace(/\/+$/, '');
      const articleUrl = normalizeUrl(url);
      const itemUrl = normalizeUrl(link);

      console.log(`Comparing: ${itemUrl} === ${articleUrl}`);

      // Compare the normalized URLs
      if (itemUrl === articleUrl) {
        console.log(`Match found! Looking for content`);

        // Try different content elements that might contain the article content
        const contentElement =
          item.querySelector('content\\:encoded') || // RSS with content:encoded namespace
          item.querySelector('content') ||           // Atom content
          item.querySelector('description');         // RSS description fallback

        if (contentElement) {
          let content = '';

          // Get the full item XML to extract CDATA content directly
          const fullItemXml = item.outerHTML || '';

          // Try to locate the specific content element in the raw XML
          let contentTagName = '';
          if (item.querySelector('content\\:encoded')) contentTagName = 'content:encoded';
          else if (item.querySelector('content')) contentTagName = 'content';
          else if (item.querySelector('description')) contentTagName = 'description';

          console.log(`Content element tag: ${contentTagName}`);

          // Extract content from raw XML using regex for the specific tag
          if (contentTagName) {
            const tagContentRegex = new RegExp(`<${contentTagName}[^>]*>\\s*(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?\\s*</${contentTagName}>`, 's');
            const match = fullItemXml.match(tagContentRegex);

            if (match && match[1]) {
              content = match[1].trim();
              console.log(`Extracted content using raw XML regex, length: ${content.length}`);
            } else {
              // Fall back to DOM-based extraction
              const rawContent = contentElement.textContent || '';
              const outerHtml = contentElement.outerHTML || '';

              console.log(`Raw content length: ${rawContent.length}`);
              console.log(`Raw HTML length: ${outerHtml.length}`);

              // Check for CDATA sections using string matching
              if (outerHtml.includes('CDATA')) {
                const cdataPattern = /<!\[CDATA\[([\s\S]*?)\]\]>/i;
                const cdataMatch = outerHtml.match(cdataPattern);

                if (cdataMatch && cdataMatch[1]) {
                  content = cdataMatch[1].trim();
                  console.log(`Extracted CDATA content from outerHTML`);
                } else {
                  content = rawContent.trim();
                  console.log(`Using raw content as fallback`);
                }
              } else {
                content = rawContent.trim();
                console.log(`Using raw content (no CDATA detected)`);
              }
            }
          }

          console.log(`Content found, length: ${content.length} characters`);

          // If content is HTML, fix relative URLs
          if (content.includes('<') && content.includes('>')) {
            content = resolveRelativeUrls(content, getBaseUrl(url));
          }

          return content;
        } else {
          console.log('No content element found in the matching item');
        }
      }
    }

    console.log(`Article with URL ${url} not found in feed`);
    return null;
  } catch (error) {
    console.error(`Error fetching article content from feed ${article.sourceUrl}:`, error);
    return null;
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

  try {
    // Get all articles from KV
    const articlesJson = await kv.get("all_articles");

    if (!articlesJson) {
      return new Response("Articles not found", { status: 404 });
    }

    // Find the specific article by ID
    const allArticles: Article[] = JSON.parse(articlesJson);
    const article = allArticles.find(a => a.id === params.id);

    if (!article) {
      return new Response("Article not found", { status: 404 });
    }

    // First try to get content from the feed
    let content = await fetchArticleContentFromFeed(article);

    // Otherwise, fall back to scraping the page
    if (!content) {
      console.log(`Falling back to page scraping for ${article.url}`);
      content = await fetchArticleContent(article.url);
    } else {
      console.log(`Successfully fetched content from feed for ${article.url}`);
    }

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

  } catch (error) {
    console.error("Error retrieving article:", error);
    return new Response(JSON.stringify({ error: "Failed to retrieve article" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}