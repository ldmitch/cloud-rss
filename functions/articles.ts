import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  ARTICLES: KVNamespace;
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

    return new Response(articlesJson, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=1740, max-age=1740, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error retrieving articles from KV:", error);
    return new Response(
      JSON.stringify({ error: "Failed to retrieve articles" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
};
