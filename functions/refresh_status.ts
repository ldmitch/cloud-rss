import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  ARTICLES: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const kv = context.env.ARTICLES;

  try {
    // Get the last update timestamp from KV
    const lastUpdateStr = await kv.get("last_update");

    if (!lastUpdateStr) {
      return new Response(JSON.stringify({
        error: "No update information available"
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        status: 404
      });
    }

    // Parse the last update time (Unix timestamp)
    const lastUpdateTimestamp = parseInt(lastUpdateStr, 10);
    if (isNaN(lastUpdateTimestamp)) {
      throw new Error("Invalid last_update timestamp format");
    }
    
    // Convert seconds to milliseconds for JavaScript Date
    const lastUpdate = new Date(lastUpdateTimestamp * 1000);

    // Calculate the next refresh time
    // Refreshes happen on the hour and half-hour
    const nextRefresh = new Date(lastUpdate);

    if (nextRefresh.getMinutes() < 30) {
      // If minutes are less than 30, next refresh is at 30 minutes
      nextRefresh.setMinutes(30, 0, 0);
    } else {
      // If minutes are 30 or more, next refresh is at the next hour
      nextRefresh.setHours(nextRefresh.getHours() + 1, 0, 0, 0);
    }

    return new Response(JSON.stringify({
      lastUpdate: lastUpdate.toISOString(),
      nextRefresh: nextRefresh.toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (error) {
    console.error("Error retrieving refresh status:", error);
    return new Response(JSON.stringify({
      error: "Failed to retrieve refresh status"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};