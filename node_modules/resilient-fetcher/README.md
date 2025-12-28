# resilient-fetcher

A robust `fetch` wrapper with retries, timeouts, backoff strategies, and interceptors.

## Installation

```bash
pnpm add resilient-fetcher
# or
npm install resilient-fetcher
```

## Usage

```ts
import { resilientFetch } from 'resilient-fetcher';

// Simple
const response = await resilientFetch('https://api.example.com/data');

// Advanced
const response = await resilientFetch('https://api.example.com/data', {
    retries: 3,
    retryDelay: 1000,
    backoff: 'exponential',
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' }
});
```

## Options

Extends standard `RequestInit`.

-   `retries`: number (default: 3)
-   `retryDelay`: number (ms) (default: 1000)
-   `timeout`: number (ms) (default: 5000)
-   `backoff`: 'fixed' | 'exponential' (default: 'fixed')
-   `retryOn`: `(error, response) => boolean` (custom retry logic)
-   `onRequest`: `(url, options) => options` (interceptor)
-   `onResponse`: `(response) => response` (interceptor)
-   `onError`: `(error) => void` (handler)

## License

MIT
