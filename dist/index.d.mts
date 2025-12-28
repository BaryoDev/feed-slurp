interface SlurpItem {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    content: string;
    author: string;
    categories: string[];
    thumbnail: string | null;
    guid: string;
}
interface SlurpFeed {
    title: string;
    description: string;
    link: string;
    lastBuildDate: string;
    items: SlurpItem[];
}
interface SlurpOptions {
    cache?: boolean;
    cacheTTL?: number;
    cacheKey?: string;
    proxy?: string | ((url: string) => string);
    timeout?: number;
    retries?: number;
}

declare function clearSlurpCache(key?: string): void;

/**
 * Slurp an RSS or Atom feed.
 * @param url The RSS/Atom feed URL
 * @param options Configuration options
 */
declare function slurp(url: string, options?: SlurpOptions): Promise<SlurpFeed>;
/**
 * Fluent API for slurp
 */
declare function createSlurper(defaultOptions?: SlurpOptions): {
    slurp: (url: string, options?: SlurpOptions) => Promise<SlurpFeed>;
    clearCache: (key?: string) => void;
};

export { type SlurpFeed, type SlurpItem, type SlurpOptions, clearSlurpCache, createSlurper, slurp };
