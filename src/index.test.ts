import { describe, it, expect, vi, beforeEach } from "vitest";
import { slurp, clearSlurpCache } from "./index";
import * as fetcher from "./fetcher";

describe("Slurp Integration", () => {
    const rssXml = `
    <rss version="2.0">
      <channel>
        <title>Integration Test</title>
        <item><title>Item 1</title><link>https://test.com/1</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item>
      </channel>
    </rss>
  `;

    beforeEach(() => {
        clearSlurpCache();
        vi.restoreAllMocks();
    });

    it("should fetch, parse, and cache a feed", async () => {
        const fetchSpy = vi.spyOn(fetcher, "fetchFeedXml").mockResolvedValue(rssXml);

        // First call (uncached)
        const feed1 = await slurp("https://test.com/rss");
        expect(feed1.title).toBe("Integration Test");
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Second call (should be cached)
        const feed2 = await slurp("https://test.com/rss");
        expect(feed2.title).toBe("Integration Test");
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should bypass cache if requested", async () => {
        const fetchSpy = vi.spyOn(fetcher, "fetchFeedXml").mockResolvedValue(rssXml);

        await slurp("https://test.com/rss", { cache: false });
        await slurp("https://test.com/rss", { cache: false });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
