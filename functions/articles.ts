import type { PagesFunction } from "@cloudflare/workers-types";
import { parseHTML } from "linkedom";

interface Article {
  id: string;
  title: string;
  snippet: string;
  snippetText?: string;
  url: string;
  source: string;
  publicationDatetime: string;
  sourceUrl: string;
}

interface Env {
  ARTICLES: KVNamespace;
}

// Helper: Decode HTML entities to their corresponding characters
function decodeHtmlEntities(text: string): string {
  if (!text) return "";

  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&nbsp;": " ",
    "&ndash;": "–",
    "&mdash;": "—",
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&sbquo;": "‚",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&bdquo;": "„",
  };

  // Replace named entities
  let result = text;
  Object.keys(entities).forEach((entity) => {
    result = result.replace(new RegExp(entity, "g"), entities[entity]);
  });

  // Replace numeric entities (decimal and hexadecimal)
  return result
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Strip HTML tags and generate plain text snippet
function generateSnippetText(htmlContent: string, maxLength: number = 150): string {
  if (!htmlContent) return "";

  try {
    // Decode HTML entities first in case content is double-encoded
    const decodedContent = decodeHtmlEntities(htmlContent);
    const { document } = parseHTML(`<div>${decodedContent}</div>`);

    // Remove unwanted elements
    const elementsToRemove = [
      "script",
      "style",
      "nav",
      "header",
      "footer",
      "aside",
      "iframe",
      "noscript",
      "svg",
      "form",
      "button",
    ];

    elementsToRemove.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        elements[i].remove();
      }
    });

    // Get text content from the wrapper div and normalize whitespace
    let text = document.querySelector("div")?.textContent || "";
    text = text.replace(/\s+/g, " ").trim();

    // Truncate if necessary
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "…";
    }
    return text;
  } catch (e) {
    // Fallback: simple regex strip
    const decoded = decodeHtmlEntities(htmlContent);
    const stripped = decoded
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.length > maxLength ? stripped.substring(0, maxLength) + "…" : stripped;
  }
}

// Handler for /articles endpoint
export const onRequest: PagesFunction<Env> = async (context) => {
  const kv = context.env.ARTICLES;
  console.log(kv);

  try {
    // Retrieve articles from KV storage
    const articlesJson = await kv.get("all_articles");

    if (!articlesJson) {
      // If no articles are found in KV, return an empty array
      console.log("No articles found in KV storage");
      return new Response(JSON.stringify([]), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300, max-age=300, must-revalidate",
        },
      });
    }

    // Parse articles and add snippetText field
    const articles: Article[] = JSON.parse(articlesJson);
    const processedArticles = articles.map((article) => ({
      ...article,
      snippetText: generateSnippetText(article.snippet),
    }));

    return new Response(JSON.stringify(processedArticles), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=840, max-age=840, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error retrieving articles from KV:", error);
    return new Response(JSON.stringify({ error: "Failed to retrieve articles" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
};
