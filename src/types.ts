export interface SlurpItem {
    title: string;
    link: string;
    pubDate: string; // ISO format
    description: string;
    content: string;
    author: string;
    categories: string[];
    thumbnail: string | null;
    guid: string;
}

export interface SlurpFeed {
    title: string;
    description: string;
    link: string;
    lastBuildDate: string;
    items: SlurpItem[];
}

export interface SlurpOptions {
    cache?: boolean;
    cacheTTL?: number; // in seconds
    cacheKey?: string;
    proxy?: string | ((url: string) => string);
    timeout?: number;
    retries?: number;
}
