# feed-slurp 🥤

A lightweight, universal RSS and Atom feed fetcher for the browser. Targeted for speed, reliability, and zero-dependency vibe (built on the `BaryoDev` stack).

## Why feed-slurp?

- **Zero Heavy Dependencies**: Instead of 50KB+ XML libraries, it uses the browser's native `DOMParser`.
- **BaryoDev Powered**: Leverages `resilient-fetcher` for automatic retries and `nano-safe-storage` for robust caching.
- **Normalized Schema**: No more worrying about the differences between RSS item tags and Atom entry tags. One clean JSON schema for everything.
- **CORS Friendly**: Built-in support for popular proxies to bypass browser restrictions.
- **Smart Cache**: Plain TTL cache via `localStorage`.

## Installation

```bash
npm install feed-slurp
```

## Basic Usage

```typescript
import { slurp } from 'feed-slurp';

// Slurp a feed with default settings (auto-cache for 1 hour)
const feed = await slurp('https://medium.com/feed/@BaryoDev');

console.log(feed.title); // "BaryoDev - Medium"
console.log(feed.items[0].thumbnail); // Auto-extracted from content or tags!
```

## Advanced Configuration

### CORS Proxies
Most RSS feeds require a proxy for browser-based fetching. `feed-slurp` makes this easy:

Pick one:

```typescript
// Built-in: api.allorigins.win
await slurp(url, { proxy: 'allorigins' });

// Built-in: corsproxy.io
await slurp(url, { proxy: 'corsproxy' });

// Your own proxy, the encoded feed URL is appended
await slurp(url, { proxy: 'https://my-proxy.com/?url=' });

// Custom function
await slurp(url, { proxy: (url) => `https://custom.worker.dev/fetch?target=${encodeURIComponent(url)}` });
```

A proxy sees every feed URL you request and can return anything it likes as the feed. Only use one you trust, or run your own.

### Caching Strategy
Caching is enabled by default to save bandwidth and improve performance.

```typescript
const feed = await slurp(url, {
  cache: true,
  cacheTTL: 3600,       // 1 hour in seconds, 0 means do not cache
  cacheKey: 'my-feed'   // Custom key for localStorage
});

// Manual cache cleanup
import { clearSlurpCache } from 'feed-slurp';
clearSlurpCache('my-feed'); // Clear specific
clearSlurpCache();          // Clear all
```

### Limits
`timeout` (default 10000 ms) applies to the request and again to reading the body. `maxBytes` (default 5 MB) caps the response body, and a larger feed throws.

```typescript
await slurp(url, { timeout: 5000, maxBytes: 1024 * 1024 });
```

## Output Schema

Regardless of whether the source is RSS 2.0 or Atom 1.0, you get this consistent structure:

```typescript
interface SlurpFeed {
  title: string;
  description: string;
  link: string;
  lastBuildDate: string;
  items: SlurpItem[];
}

interface SlurpItem {
  title: string;
  link: string;
  pubDate: string | null; // ISO 8601 string, null if missing or unparseable
  description: string;   // Plain text / snippet, tags removed and entities decoded
  content: string;       // Full HTML content, falls back to the description when the item has no content:encoded
  author: string;
  categories: string[];
  thumbnail: string | null; // Extracted thumbnail URL, absolute
  guid: string;
}
```

## Untrusted input

`content` is raw HTML from the feed. `description` is plain text, but like every field it comes from the feed (and from the CORS proxy, if you use one), so treat it as untrusted. Sanitise `content` (for example with DOMPurify) before you render it as HTML. Use `textContent`, not `innerHTML`, for the other fields.

## URLs

`link` and `thumbnail` are resolved against the feed URL (not the proxy URL), and `xml:base` is honoured. `javascript:`, `data:` and `vbscript:` URLs are dropped: `link` becomes `""` and `thumbnail` becomes `null`. For Atom, `link` is the `rel="alternate"` link, or a link with no `rel`. `self`, `replies` and other relations are never used.

## Malformed feeds

HTML entities that XML does not define (`&nbsp;`, `&copy;`, `&mdash;` and the rest of the HTML 4 set) are accepted. Any other XML error throws.

## License

MPL-2.0 © Arnel I. Robles
