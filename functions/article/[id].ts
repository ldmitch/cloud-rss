import { SingleArticleResponse } from '../types';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify with a JSDOM window
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure DOMPurify to allow common article elements
const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'ul', 'ol', 'li', 'blockquote',
  'code', 'pre', 'strong', 'em', 'br', 'div'
];

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
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Basic content extraction (simplified readability-like approach)
    const article = document.querySelector('article') || document.body;
    
    // Remove unwanted elements
    ['script', 'style', 'iframe', 'nav', 'header', 'footer'].forEach(tag => {
      article.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Clean the HTML
    const cleanHtml = purify.sanitize(article.innerHTML, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
    });

    const apiResponse: SingleArticleResponse = { content: cleanHtml };
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