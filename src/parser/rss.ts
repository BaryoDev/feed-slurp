import { SlurpFeed, SlurpItem } from "../types";
import { getCDataOrText, getText, findNode } from "./xml";
import { toIsoDate } from "./date";
import { baseFor, fallbackGuid, htmlToText, resolveUrl } from "./text";

export function parseRss(doc: Document, feedUrl?: string): SlurpFeed {
    const channel = doc.querySelector("channel");
    if (!channel) throw new Error("Invalid RSS feed: Missing <channel>");

    const items: SlurpItem[] = Array.from(doc.querySelectorAll("item")).map((item, index) => {
        let description = htmlToText(getText(item, "description"));
        const content = getCDataOrText(item, ["content:encoded", "description", "summary"]);

        // Fallback: If description is empty, use a snippet of content
        if (!description && content) {
            description = htmlToText(content).substring(0, 160).trim() + "...";
        }

        const linkEl = findNode(item, "link");
        const link = resolveUrl(getText(item, "link"), baseFor(linkEl, feedUrl)) ?? "";

        const title = getText(item, "title");
        const pubDate = toIsoDate(getText(item, "pubDate"));

        return {
            title,
            link,
            pubDate,
            description,
            content,
            author: getText(item, "dc\\:creator") || getText(item, "author") || "Unknown",
            categories: Array.from(item.querySelectorAll("category")).map(c => c.textContent || ""),
            guid: getText(item, "guid") || link || fallbackGuid(title, pubDate, index),
            thumbnail: extractThumbnail(item, content, feedUrl)
        };
    });

    return {
        title: getText(channel, "title"),
        description: htmlToText(getText(channel, "description")),
        link: resolveUrl(getText(channel, "link"), baseFor(findNode(channel, "link"), feedUrl)) ?? "",
        lastBuildDate: getText(channel, "lastBuildDate") || new Date().toISOString(),
        items
    };
}

function extractThumbnail(item: Element, content: string, feedUrl?: string): string | null {
    const base = baseFor(item, feedUrl);
    // 1. Try media:content or media:thumbnail
    const mediaTags = ["media\\:content", "media\\:thumbnail", "content", "thumbnail"];
    for (const tag of mediaTags) {
        const el = findNode(item, tag);
        if (el) {
            const url = el.getAttribute("url") || el.getAttribute("src");
            if (url) return resolveUrl(url, baseFor(el, feedUrl));
        }
    }

    // 2. Try enclosure
    const enclosure = item.querySelector("enclosure[type^='image']");
    if (enclosure) {
        const url = enclosure.getAttribute("url");
        if (url) return resolveUrl(url, baseFor(enclosure, feedUrl));
    }

    // 3. Fallback: extract first img from content
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = content.match(imgRegex);
    if (match && match[1]) return resolveUrl(match[1], base);

    return null;
}
