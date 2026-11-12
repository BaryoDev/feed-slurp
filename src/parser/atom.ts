import { SlurpFeed, SlurpItem } from "../types";
import { getText } from "./xml";
import { toIsoDate } from "./date";
import { baseFor, fallbackGuid, htmlToText, resolveUrl } from "./text";

/** The entry or feed link: rel="alternate", then a link with no rel (alternate by RFC 4287). Never self, replies or other rels. */
function alternateLink(parent: Element, feedUrl?: string): string {
    const links = Array.from(parent.children).filter((c) => c.localName === "link" && c.getAttribute("href"));
    const link =
        links.find((l) => l.getAttribute("rel") === "alternate") ||
        links.find((l) => !l.hasAttribute("rel") || l.getAttribute("rel") === "");
    return link ? resolveUrl(link.getAttribute("href"), baseFor(link, feedUrl)) ?? "" : "";
}

export function parseAtom(doc: Document, feedUrl?: string): SlurpFeed {
    const feed = doc.querySelector("feed");
    if (!feed) throw new Error("Invalid Atom feed: Missing <feed>");

    const items: SlurpItem[] = Array.from(doc.querySelectorAll("entry")).map((entry, index) => {
        const content = getText(entry, "content") || getText(entry, "summary");

        const title = getText(entry, "title");
        const pubDate = toIsoDate(getText(entry, "updated")) ?? toIsoDate(getText(entry, "published"));

        return {
            title,
            link: alternateLink(entry, feedUrl),
            pubDate,
            description: htmlToText(getText(entry, "summary")),
            content,
            author: getText(entry, "author name") || "Unknown",
            categories: Array.from(entry.querySelectorAll("category")).map(c => c.getAttribute("term") || ""),
            guid: getText(entry, "id") || fallbackGuid(title, pubDate, index),
            thumbnail: extractThumbnail(entry, content, feedUrl)
        };
    });

    return {
        title: getText(feed, "title"),
        description: htmlToText(getText(feed, "subtitle")),
        link: alternateLink(feed, feedUrl),
        lastBuildDate: getText(feed, "updated"),
        items
    };
}

function extractThumbnail(entry: Element, content: string, feedUrl?: string): string | null {
    // Atom sometimes uses link rel="enclosure"
    const enclosure = entry.querySelector("link[rel='enclosure'][type^='image']");
    if (enclosure) return resolveUrl(enclosure.getAttribute("href"), baseFor(enclosure, feedUrl));

    // Fallback: extract first img from content
    const match = content.match(/<img[^>]+src="([^">]+)"/);
    return match ? resolveUrl(match[1], baseFor(entry, feedUrl)) : null;
}
