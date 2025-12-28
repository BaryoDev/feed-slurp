import { describe, it, expect } from "vitest";
import { parseXml } from "./xml";
import { parseRss } from "./rss";

describe("RSS Parser", () => {
    const rssXml = `
    <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
      <channel>
        <title>Test Blog</title>
        <description>Test Description</description>
        <link>https://test.com</link>
        <item>
          <title>Post 1</title>
          <link>https://test.com/post1</link>
          <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
          <description>Short desk</description>
          <content:encoded><![CDATA[<p>Full content</p>]]></content:encoded>
          <dc:creator>John Doe</dc:creator>
          <category>Tech</category>
          <category>AI</category>
        </item>
      </channel>
    </rss>
  `;

    it("should normalize RSS 2.0 to SlurpFeed", () => {
        const doc = parseXml(rssXml);
        const feed = parseRss(doc);

        expect(feed.title).toBe("Test Blog");
        expect(feed.items).toHaveLength(1);

        const item = feed.items[0];
        expect(item.title).toBe("Post 1");
        expect(item.author).toBe("John Doe");
        expect(item.categories).toContain("Tech");
        expect(item.pubDate).toBe("2024-01-01T00:00:00.000Z");
        expect(item.content).toBe("<p>Full content</p>");
    });
});
