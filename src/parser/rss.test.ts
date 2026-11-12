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
  it("should extract thumbnails from media tags or content", () => {
    const xml = `
          <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
            <channel>
              <item>
                <title>Media Post</title>
                <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
                <content:encoded><![CDATA[<p><img src="https://test.com/img.jpg" /></p>]]></content:encoded>
                <media:content url="https://test.com/media.jpg" medium="image" />
              </item>
              <item>
                <title>Regex Post</title>
                <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
                <content:encoded><![CDATA[<p><img src='https://test.com/regex.jpg' /></p>]]></content:encoded>
              </item>
            </channel>
          </rss>
        `;
    const doc = parseXml(xml);
    const feed = parseRss(doc);

    expect(feed.items[0].thumbnail).toBe("https://test.com/media.jpg");
    expect(feed.items[1].thumbnail).toBe("https://test.com/regex.jpg");
  });
  it("should keep items with a missing or malformed date", () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <title>Dates</title>
          <item><title>Good</title><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item>
          <item><title>Dateless</title></item>
          <item><title>Malformed</title><pubDate>not a date</pubDate></item>
        </channel>
      </rss>
    `;
    const feed = parseRss(parseXml(xml));

    expect(feed.items).toHaveLength(3);
    expect(feed.items[0].pubDate).toBe("2024-01-01T00:00:00.000Z");
    expect(feed.items[1].pubDate).toBeNull();
    expect(feed.items[2].pubDate).toBeNull();
  });

  it("returns description as plain text and leaves content as HTML", () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <item>
            <title>T</title>
            <description><![CDATA[<script>alert(1)</script><b>hi</b> &amp; <i>there</i>&nbsp;now]]></description>
          </item>
        </channel>
      </rss>
    `;
    const item = parseRss(parseXml(xml)).items[0];

    expect(item.description).toBe("hi & there\u00a0now");
    expect(item.description).not.toContain("<");
    expect(item.content).toContain("<b>hi</b>");
  });

  it("resolves relative links and thumbnails and drops unsafe schemes", () => {
    const xml = `
      <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
        <channel>
          <link>/home</link>
          <item><title>Rel</title><link>/posts/1</link><media:thumbnail url="img/a.png"/></item>
          <item><title>Js</title><link>javascript:alert(1)</link><media:thumbnail url="javascript:alert(3)"/></item>
          <item><title>Data</title><link>data:text/html,x</link><enclosure type="image/png" url=" vbscript:x"/></item>
        </channel>
      </rss>
    `;
    const feed = parseRss(parseXml(xml), "https://blog.test/a/feed.xml");

    expect(feed.link).toBe("https://blog.test/home");
    expect(feed.items[0].link).toBe("https://blog.test/posts/1");
    expect(feed.items[0].thumbnail).toBe("https://blog.test/a/img/a.png");
    expect(feed.items[1].link).toBe("");
    expect(feed.items[1].thumbnail).toBeNull();
    expect(feed.items[1].guid).not.toBe("");
    expect(feed.items[2].link).toBe("");
    expect(feed.items[2].thumbnail).toBeNull();
  });

  it("honours xml:base", () => {
    const xml = `
      <rss version="2.0">
        <channel xml:base="https://cdn.test/root/">
          <item><title>A</title><link>one</link></item>
          <item xml:base="https://other.test/"><title>B</title><link>two</link></item>
        </channel>
      </rss>
    `;
    const feed = parseRss(parseXml(xml), "https://blog.test/feed.xml");

    expect(feed.items[0].link).toBe("https://cdn.test/root/one");
    expect(feed.items[1].link).toBe("https://other.test/two");
  });

  it("parses a feed with HTML entities XML does not define", () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <title>a&nbsp;b &copy; 2024 &mdash; &amp; &#169;</title>
          <item><title>x</title><description><![CDATA[keep &nbsp; raw]]></description></item>
        </channel>
      </rss>
    `;
    const feed = parseRss(parseXml(xml));

    expect(feed.title).toBe("a\u00a0b \u00a9 2024 \u2014 & \u00a9");
    expect(feed.items[0].content).toBe("keep &nbsp; raw");
  });

  it("gives items with no guid and no usable link different guids", () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <item><title>Same</title><link>javascript:a</link></item>
          <item><title>Same</title><link>javascript:b</link></item>
          <item><link>javascript:c</link></item>
        </channel>
      </rss>
    `;
    const guids = parseRss(parseXml(xml)).items.map((i) => i.guid);

    expect(guids.every((g) => g !== "")).toBe(true);
    expect(new Set(guids).size).toBe(3);
  });
});
