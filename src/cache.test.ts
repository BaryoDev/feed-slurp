import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCachedFeed, setCachedFeed, clearSlurpCache } from "./cache";
import { SlurpFeed } from "./types";

describe("Cache Layer", () => {
    const mockFeed: SlurpFeed = {
        title: "Cached Blog",
        description: "Desc",
        link: "https://test.com",
        lastBuildDate: "2024-01-01",
        items: []
    };

    beforeEach(() => {
        clearSlurpCache();
    });

    it("should store and retrieve feed", () => {
        setCachedFeed("test-key", mockFeed);
        const cached = getCachedFeed("test-key");
        expect(cached?.title).toBe("Cached Blog");
    });

    it("should return null for expired or missing keys", () => {
        expect(getCachedFeed("missing")).toBeNull();
    });
});
