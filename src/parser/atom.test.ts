import { describe, it, expect } from "vitest";
import { parseXml } from "./xml";
import { parseAtom } from "./atom";

describe("Atom Parser", () => {
    const atomXml = `
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Test Atom</title>
      <subtitle>Atom Desc</subtitle>
      <link rel="alternate" href="https://test.com"/>
      <updated>2024-01-01T12:00:00Z</updated>
      <entry>
        <title>Atom Post</title>
        <link rel="alternate" href="https://test.com/atom1"/>
        <id>urn:uuid:123</id>
        <published>2024-01-01T10:00:00Z</published>
        <updated>2024-01-01T12:00:00Z</updated>
        <author>
          <name>Jane Doe</name>
        </author>
        <summary>Short</summary>
        <content type="html"><![CDATA[<p>Full</p>]]></content>
        <category term="News"/>
      </entry>
    </feed>
  `;

    it("should normalize Atom 1.0 to SlurpFeed", () => {
        const doc = parseXml(atomXml);
        const feed = parseAtom(doc);

        expect(feed.title).toBe("Test Atom");
        expect(feed.items).toHaveLength(1);

        const item = feed.items[0];
        expect(item.title).toBe("Atom Post");
        expect(item.author).toBe("Jane Doe");
        expect(item.categories).toContain("News");
        expect(item.pubDate).toBe("2024-01-01T12:00:00.000Z");
        expect(item.content).toBe("<p>Full</p>");
    });
});
