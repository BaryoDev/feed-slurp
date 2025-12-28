import { SlurpFeed, SlurpItem } from "../types";
import { getText } from "./xml";

export function parseAtom(doc: Document): SlurpFeed {
    const feed = doc.querySelector("feed");
    if (!feed) throw new Error("Invalid Atom feed: Missing <feed>");

    const items: SlurpItem[] = Array.from(doc.querySelectorAll("entry")).map((entry) => {
        const content = getText(entry, "content") || getText(entry, "summary");

        return {
            title: getText(entry, "title"),
            link: entry.querySelector("link[rel='alternate']")?.getAttribute("href") || entry.querySelector("link")?.getAttribute("href") || "",
            pubDate: new Date(getText(entry, "updated") || getText(entry, "published")).toISOString(),
            description: getText(entry, "summary"),
            content,
            author: getText(entry, "author name") || "Unknown",
            categories: Array.from(entry.querySelectorAll("category")).map(c => c.getAttribute("term") || ""),
            guid: getText(entry, "id"),
            thumbnail: extractThumbnail(entry, content)
        };
    });

    return {
        title: getText(feed, "title"),
        description: getText(feed, "subtitle") || "",
        link: feed.querySelector("link[rel='alternate']")?.getAttribute("href") || feed.querySelector("link")?.getAttribute("href") || "",
        lastBuildDate: getText(feed, "updated"),
        items
    };
}

function extractThumbnail(entry: Element, content: string): string | null {
    // Atom sometimes uses link rel="enclosure"
    const enclosure = entry.querySelector("link[rel='enclosure'][type^='image']");
    if (enclosure) return enclosure.getAttribute("href");

    // Fallback: extract first img from content
    const match = content.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
}
