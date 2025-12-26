# Cloud RSS

A simple web-based RSS and ATOM reader deployed to Cloudflare Pages.

## Overview

Cloud RSS is a front-end for my [Cloud RSS Worker](https://github.com/ldmitch/cloud-rss-worker), allowing you to view a list of articles fetched from Cloudflare KV. The Worker is responsible for fetching the articles from various RSS/ATOM feeds and caching them in KV storage. Individual articles are fetched directly by a Cloudflare Pages Function and are returned to the front-end for display, meaning that clients' IP addresses are never revealed to the feed providers.

The list of available articles is updated every 15 minutes, and the last 48 hours of history is viewable.

## Setup

### Prerequisites

- Node.js and pnpm
- [Cloud RSS Worker](https://github.com/ldmitch/cloud-rss-worker) deployed and configured

### Local Development

1. Clone or copy this directory.

2. Install dependencies (only needed for local dev server and Cloudflare Functions):

   ```bash
   pnpm install
   ```

3. Make sure Cloud RSS Worker is set up in an adjacent directory:

   ```
   /your-projects/
     /cloud-rss
     /cloud-rss-worker
   ```

4. Start the development server:

   ```bash
   pnpm run dev
   ```

5. Open http://localhost:8788 in your browser.

### Deployment to Cloudflare Pages

The project is configured to deploy to Cloudflare Pages. You'll need to set up:

1. [Cloud RSS Worker](https://github.com/ldmitch/cloud-rss-worker) must be deployed first.
2. A Cloudflare Pages project linked to your Cloud RSS repository.
3. A KV namespace named `ARTICLES` to store article previews.
   - This should already have been created when you deployed Cloud RSS Worker.
4. The KV namespace ID in [`wrangler.toml`](./wrangler.toml).

## License

[MIT License](./LICENSE.md)
