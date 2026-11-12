export interface SlurpItem {
    title: string;
    link: string;
    pubDate: string | null; // ISO format, null when missing or unparseable
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
    cacheTTL?: number; // in seconds, 0 turns caching off for the call
    cacheKey?: string;
    proxy?: string | ((url: string) => string);
    timeout?: number;
    retries?: number;
    maxBytes?: number; // largest response body to read, default 5 MB
}
