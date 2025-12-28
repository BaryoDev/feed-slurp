import { SlurpFeed, SlurpItem } from "../types";
import { getCDataOrText, getText, findNode } from "./xml";

export function parseRss(doc: Document): SlurpFeed {
    const channel = doc.querySelector("channel");
    if (!channel) throw new Error("Invalid RSS feed: Missing <channel>");

    const items: SlurpItem[] = Array.from(doc.querySelectorAll("item")).map((item) => {
        let description = getText(item, "description");
        const content = getCDataOrText(item, ["content:encoded", "description", "summary"]);

        // Fallback: If description is empty, use a snippet of content
        if (!description && content) {
            description = content.replace(/<[^>]+>/g, "").substring(0, 160).trim() + "...";
        }

        return {
            title: getText(item, "title"),
            link: getText(item, "link"),
            pubDate: new Date(getText(item, "pubDate")).toISOString(),
            description,
            content,
            author: getText(item, "dc\\:creator") || getText(item, "author") || "Unknown",
            categories: Array.from(item.querySelectorAll("category")).map(c => c.textContent || ""),
            guid: getText(item, "guid") || getText(item, "link"),
            thumbnail: extractThumbnail(item, content)
        };
    });

    return {
        title: getText(channel, "title"),
        description: getText(channel, "description"),
        link: getText(channel, "link"),
        lastBuildDate: getText(channel, "lastBuildDate") || new Date().toISOString(),
        items
    };
}

function extractThumbnail(item: Element, content: string): string | null {
    // 1. Try media:content or media:thumbnail
    const mediaTags = ["media\\:content", "media\\:thumbnail", "content", "thumbnail"];
    for (const tag of mediaTags) {
        const el = findNode(item, tag);
        if (el) {
            const url = el.getAttribute("url") || el.getAttribute("src");
            if (url) return url;
        }
    }

    // 2. Try enclosure
    const enclosure = item.querySelector("enclosure[type^='image']");
    if (enclosure) {
        const url = enclosure.getAttribute("url");
        if (url) return url;
    }

    // 3. Fallback: extract first img from content
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = content.match(imgRegex);
    if (match && match[1]) return match[1];

    return null;
}
