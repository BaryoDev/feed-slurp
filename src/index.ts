import { SlurpFeed, SlurpOptions } from "./types";
import { fetchFeedXml } from "./fetcher";
import { parseXml } from "./parser/xml";
import { parseRss } from "./parser/rss";
import { parseAtom } from "./parser/atom";
import { getCachedFeed, setCachedFeed, clearSlurpCache } from "./cache";

export * from "./types";
export { clearSlurpCache };

/**
 * Slurp an RSS or Atom feed.
 * @param url The RSS/Atom feed URL
 * @param options Configuration options
 */
export async function slurp(url: string, options: SlurpOptions = {}): Promise<SlurpFeed> {
    const { cache = true, cacheTTL, cacheKey = url } = options;

    // 1. Check Cache
    const useCache = cache && !(cacheTTL !== undefined && cacheTTL <= 0);

    if (useCache) {
        const cached = getCachedFeed(cacheKey);
        if (cached) return cached;
    }

    // 2. Fetch
    const xml = await fetchFeedXml(url, options);

    // 3. Parse
    const doc = parseXml(xml);
    const isAtom = doc.querySelector("feed") !== null;
    const feed = isAtom ? parseAtom(doc, url) : parseRss(doc, url);

    // 4. Cache Result
    if (useCache) {
        setCachedFeed(cacheKey, feed, cacheTTL);
    }

    return feed;
}

/**
 * Fluent API for slurp
 */
export function createSlurper(defaultOptions: SlurpOptions = {}) {
    return {
        slurp: (url: string, options: SlurpOptions = {}) => slurp(url, { ...defaultOptions, ...options }),
        clearCache: (key?: string) => clearSlurpCache(key)
    };
}
