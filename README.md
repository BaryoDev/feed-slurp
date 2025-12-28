# feed-slurp 🥤

A lightweight, universal RSS and Atom feed fetcher for the browser. Targeted for speed, zero-dependency (leverages `BaryoDev` libraries), and built-in caching.

## Features

- 🚀 **Universal Parser**: Handles RSS 2.0 and Atom 1.0.
- 📦 **BaryoDev Powered**: Uses `resilient-fetcher` for reliable networking and `nano-safe-storage` for caching.
- 💾 **Smart Caching**: Built-in localStorage caching with TTL support.
- 🛡️ **CORS Proxy Ready**: Built-in support for multiple CORS proxies.
- 🏗️ **Normalized Output**: Consistent JSON schema regardless of feed type.
- 🪶 **Tiny**: Minimal footprint (~2KB gzipped).

## Installation

```bash
npm install feed-slurp
```

## Usage

### Simple Slurp

```typescript
import { slurp } from 'feed-slurp';

const feed = await slurp('https://medium.com/feed/@BaryoDev');

console.log(feed.title);
console.log(feed.items[0].title);
```

### With Options (Caching & Proxy)

```typescript
const feed = await slurp('https://medium.com/feed/@BaryoDev', {
  cache: true,
  cacheTTL: 3600, // 1 hour
  proxy: 'allorigins', // or 'corsproxy' or custom function
  timeout: 5000,
  retries: 2
});
```

### Fluent API

```typescript
import { createSlurper } from 'feed-slurp';

const slurper = createSlurper({
  proxy: 'allorigins',
  cacheTTL: 1800
});

const feed = await slurper.slurp('https://example.com/feed.xml');
```

## API

### `slurp(url, options?)`
Fetches and parses a feed.

- `url`: The feed URL.
- `options`: 
  - `cache`: Boolean, default `true`.
  - `cacheTTL`: Cache duration in seconds.
  - `proxy`: `'allorigins' | 'corsproxy' | string | (url) => string`.
  - `timeout`: Request timeout in ms.
  - `retries`: Number of retry attempts.

### `clearSlurpCache(key?)`
Clears the localStorage cache.

## License

MPL-2.0 © Arnel I. Robles
