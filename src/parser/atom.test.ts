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

    it("should keep entries with a missing or malformed date", () => {
        const xml = `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Dates</title>
          <entry><title>Good</title><updated>2024-01-01T12:00:00Z</updated></entry>
          <entry><title>Dateless</title></entry>
          <entry><title>Malformed</title><updated>not a date</updated></entry>
        </feed>
      `;
        const feed = parseAtom(parseXml(xml));

        expect(feed.items).toHaveLength(3);
        expect(feed.items[0].pubDate).toBe("2024-01-01T12:00:00.000Z");
        expect(feed.items[1].pubDate).toBeNull();
        expect(feed.items[2].pubDate).toBeNull();
    });

    it("should fall back to published when updated is malformed", () => {
        const xml = `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Dates</title>
          <entry><title>Fallback</title><updated>not a date</updated><published>2024-01-01T10:00:00Z</published></entry>
        </feed>
      `;
        const feed = parseAtom(parseXml(xml));

        expect(feed.items[0].pubDate).toBe("2024-01-01T10:00:00.000Z");
    });

    it("prefers alternate, then a rel-less link, and never self or replies", () => {
        const xml = `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Links</title>
          <link rel="self" href="https://x/atom"/>
          <entry><title>A</title><link rel="replies" href="https://x/r"/><link href="https://x/e"/></entry>
          <entry><title>B</title><link rel="self" href="https://x/s"/><link rel="alternate" href="/b"/></entry>
          <entry><title>C</title><link rel="replies" href="https://x/r"/><link rel="enclosure" href="https://x/f.mp3"/></entry>
        </feed>
      `;
        const feed = parseAtom(parseXml(xml), "https://x/atom");

        expect(feed.link).toBe("");
        expect(feed.items[0].link).toBe("https://x/e");
        expect(feed.items[1].link).toBe("https://x/b");
        expect(feed.items[2].link).toBe("");
    });

    it("resolves relative urls, honours xml:base and drops unsafe schemes", () => {
        const xml = `
        <feed xmlns="http://www.w3.org/2005/Atom" xml:base="https://base.test/dir/">
          <title>T</title>
          <link href="home"/>
          <entry><title>A</title><link href="a"/><link rel="enclosure" type="image/png" href="javascript:x"/></entry>
          <entry><title>B</title><link href="data:text/html,x"/><link rel="enclosure" type="image/png" href="p.png"/></entry>
        </feed>
      `;
        const feed = parseAtom(parseXml(xml), "https://x/atom");

        expect(feed.link).toBe("https://base.test/dir/home");
        expect(feed.items[0].link).toBe("https://base.test/dir/a");
        expect(feed.items[0].thumbnail).toBeNull();
        expect(feed.items[1].link).toBe("");
        expect(feed.items[1].thumbnail).toBe("https://base.test/dir/p.png");
    });

    it("returns summary as plain text", () => {
        const xml = `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>T</title>
          <entry><title>A</title><summary type="html">&lt;p&gt;Hi &lt;b&gt;you&lt;/b&gt;&lt;/p&gt;</summary></entry>
        </feed>
      `;

        expect(parseAtom(parseXml(xml)).items[0].description).toBe("Hi you");
    });
});
