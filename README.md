# cloud-rss

A fast and secure, self-hostable RSS/ATOM reader front-end. Built with React and Cloudflare.

## Overview

Cloud RSS is a front-end for my [Cloud RSS Worker](https://github.com/ldmitch/cloud-rss-worker), allowing you to view a list of articles fetched from Cloudflare KV. The Worker is responsible for fetching the articles from various RSS/ATOM feeds and caching them in KV storage. Individual articles are fetched directly by a Cloudflare Pages Function and are returned to the front-end for display, meaning that users' IP addresses are never revealed to the feed providers.

The list of available articles is updated every 30 minutes, and the last 48 hours of history is viewable.

## Differences from traditional RSS readers

- **Speed & bandwidth consumption**: Article previews are fetched in the background every 30 minutes and stored in Cloudflare KV. This means that your personal device doesn't need to repeatedly make multiple requests to the feed providers, nor do you need to sit and wait for the refresh to occur, saving time and bandwidth. Conversely, full articles are fetched on-demand, instead of being stored on your device. This can lead to a small delay when opening an article, but it ensures that you always get the latest version.
- **Privacy**: Articles (both the previews and full contents) are always fetched via Cloudflare Workers, meaning that your IP address is never revealed to the feed providers. Additionally, as the site updates every 30 minutes, there is a lower chance of timezone correlation by feed providers. Of course, there are neither first-party nor third-party ads or trackers on the site, and no cookies are used.
- **Access**: As the reader is hosted on Cloudflare Pages, the site is accessible from any device with a web browser without needing to install any additional software (e.g., locked-down work computers). If you would rather your articles *not be made public*, you can restrict access to the site with [Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/).

## Setup and local development

### Prerequisites

- pnpm
- [Cloud RSS Worker](https://github.com/ldmitch/cloud-rss-worker) set up on the same machine AND in an adjacent directory. I.e., your setup should look like this:
```
/projects-folder
	/cloud-rss
	/cloud-rss-worker
```

### Local development

1. Clone the repository to your projects folder
```bash
git clone https://github.com/ldmitch/cloud-rss
cd cloud-rss
```

2. Install dependencies
```bash
pnpm install
```

3. Start the development server
```bash
pnpm run wrangler
```

### Building for production

```bash
pnpm run build
```

### Deployment to Cloudflare Pages

The project is configured to deploy to Cloudflare Pages. You'll need to set up:

1. [Cloud RSS Worker](https://github.com/ldmitch/cloud-rss-worker) must be deployed first
2. A Cloudflare Pages project linked to your Cloud RSS repository
3. A KV namespace named `ARTICLES` to store article previews
	 - This should already have been created when you deployed Cloud RSS Worker
4. Edit the KV namespace ID in [`wrangler.toml`](./wrangler.toml)

## License

[MIT License](./LICENSE.md)

## Contributing

Contributions are welcome-- feel free to submit a pull request.
