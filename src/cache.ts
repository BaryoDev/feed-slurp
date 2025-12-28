import { createStorage } from "nano-safe-storage";
import { SlurpFeed } from "./types";

const storage = createStorage({
    prefix: "slurp_",
    ttl: 3600 // Default 1 hour
});

export function getCachedFeed(key: string): SlurpFeed | null {
    return storage.get<SlurpFeed>(key);
}

export function setCachedFeed(key: string, feed: SlurpFeed, ttl?: number): void {
    storage.set(key, feed, ttl ? { ttl } : undefined);
}

export function clearSlurpCache(key?: string): void {
    if (key) {
        storage.remove(key);
    } else {
        storage.clear();
    }
}
