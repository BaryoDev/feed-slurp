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
    // Try media:content or media:thumbnail
    const media = item.querySelector("media\\:content, media\\:thumbnail, enclosure[type^='image']");
    if (media) {
        return media.getAttribute("url") || media.getAttribute("src");
    }

    // Fallback: extract first img from content
    const match = content.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
}
