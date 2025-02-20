export interface Article {
  id: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  snippet: string;
  publicationDatetime: string;
  source: string;
}

export interface RSSSource {
  name: string;
  url: string;
}

export interface RSSArticleResponse {
  articles: Article[];
  error?: string;
}

export interface SingleArticleResponse {
  content: string;
  error?: string;
}

// RSS Feed Interfaces
export interface RSSFeed {
  rss: {
    channel: {
      item: RSSItem[];
    };
  };
}

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  guid: string;
  pubDate: string;
  'content:encoded'?: string;
}