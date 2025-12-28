import { SlurpFeed, SlurpItem } from "../types";
import { getCDataOrText, getText } from "./xml";

export function parseRss(doc: Document): SlurpFeed {
    const channel = doc.querySelector("channel");
    if (!channel) throw new Error("Invalid RSS feed: Missing <channel>");

    const items: SlurpItem[] = Array.from(doc.querySelectorAll("item")).map((item) => {
        const description = getText(item, "description");
        const content = getCDataOrText(item, ["content:encoded", "description"]);

        return {
            title: getText(item, "title"),
            link: getText(item, "link"),
            pubDate: new Date(getText(item, "pubDate")).toISOString(),
            description,
            content,
            author: getText(item, "dc\\:creator") || "Unknown",
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
    // 1. Try media:content or media:thumbnail (standard RSS extensions)
    // We check both namespaced and plain tags to be safe
    const mediaTags = ["media\\:content", "media\\:thumbnail", "content", "thumbnail"];
    for (const tag of mediaTags) {
        const el = item.querySelector(tag);
        if (el) {
            const url = el.getAttribute("url") || el.getAttribute("src");
            if (url) return url;
        }
    }

    // 2. Try enclosure tag (common for podcasts/media feeds)
    const enclosure = item.querySelector("enclosure[type^='image']");
    if (enclosure) {
        const url = enclosure.getAttribute("url");
        if (url) return url;
    }

    // 3. Fallback: extract first img from content using a more flexible regex
    // This handles both single and double quotes, and various spacing
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = content.match(imgRegex);
    if (match && match[1]) return match[1];

    return null;
}
