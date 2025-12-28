# feed-slurp 🥤

A lightweight, universal RSS and Atom feed fetcher for the browser. Targeted for speed, reliability, and zero-dependency vibe (built on the `BaryoDev` stack).

## Why feed-slurp?

- **Zero Heavy Dependencies**: Instead of 50KB+ XML libraries, it uses the browser's native `DOMParser`.
- **BaryoDev Powered**: Leverages `resilient-fetcher` for automatic retries and `nano-safe-storage` for robust caching.
- **Normalized Schema**: No more worrying about the differences between RSS item tags and Atom entry tags. One clean JSON schema for everything.
- **CORS Friendly**: Built-in support for popular proxies to bypass browser restrictions.
- **Smart Cache**: Stale-while-revalidate inspired behavior via `localStorage`.

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

```typescript
const feed = await slurp(url, {
  proxy: 'allorigins' // Built-in: api.allorigins.win
  // OR
  proxy: 'corsproxy'  // Built-in: corsproxy.io
  // OR
  proxy: 'https://my-proxy.com/?url='
  // OR custom function
  proxy: (url) => `https://custom.worker.dev/fetch?target=${encodeURIComponent(url)}`
});
```

### Caching Strategy
Caching is enabled by default to save bandwidth and improve performance.

```typescript
const feed = await slurp(url, {
  cache: true,
  cacheTTL: 3600,       // 1 hour in seconds
  cacheKey: 'my-feed'   // Custom key for localStorage
});

// Manual cache cleanup
import { clearSlurpCache } from 'feed-slurp';
clearSlurpCache('my-feed'); // Clear specific
clearSlurpCache();          // Clear all
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
  pubDate: string;        // ISO 8601 string
  description: string;   // Plain text / snippet
  content: string;       // Full HTML content
  author: string;
  categories: string[];
  thumbnail: string | null; // Extracted thumbnail URL
  guid: string;
}
```

## License

MPL-2.0 © Arnel I. Robles
