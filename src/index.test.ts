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

describe("Slurp options", () => {
    const rssXml = `<rss version="2.0"><channel><title>T</title></channel></rss>`;

    beforeEach(() => {
        clearSlurpCache();
        vi.restoreAllMocks();
    });

    it("does not cache when cacheTTL is 0", async () => {
        const fetchSpy = vi.spyOn(fetcher, "fetchFeedXml").mockResolvedValue(rssXml);

        await slurp("https://test.com/zero", { cacheTTL: 0 });
        await slurp("https://test.com/zero", { cacheTTL: 0 });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(localStorage.getItem("slurp_https://test.com/zero")).toBeNull();
    });

    it("resolves relative links against the feed url, not the proxy", async () => {
        const xml = `<rss version="2.0"><channel><title>T</title><item><title>A</title><link>/posts/1</link></item></channel></rss>`;
        vi.spyOn(fetcher, "fetchFeedXml").mockResolvedValue(xml);

        const feed = await slurp("https://blog.test/feed.xml", { cache: false, proxy: "corsproxy" });

        expect(feed.items[0].link).toBe("https://blog.test/posts/1");
    });
});
