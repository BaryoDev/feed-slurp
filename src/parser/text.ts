const UNSAFE_SCHEME = /^(javascript|data|vbscript):/i;
const XML_NS = "http://www.w3.org/XML/1998/namespace";

/** Turn an HTML snippet into plain text: drop tags, decode entities. */
export function htmlToText(html: string): string {
    if (!html) return "";
    const stripped = html
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
        .replace(/<[^>]+>/g, "");
    const doc = new DOMParser().parseFromString(stripped, "text/html");
    return (doc.body?.textContent || "").trim();
}

function xmlBase(el: Element): string | null {
    return el.getAttributeNS(XML_NS, "base") || el.getAttribute("xml:base");
}

function applyBase(value: string, base: string | undefined): string | undefined {
    try {
        return new URL(value, base).href;
    } catch {
        return base;
    }
}

/** The base URL for an element: the feed URL, then every xml:base from the root down to the element. */
export function baseFor(el: Element | null, feedUrl?: string): string | undefined {
    const bases: string[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
        const b = xmlBase(node);
        if (b) bases.unshift(b);
    }
    let base = feedUrl;
    for (const b of bases) {
        try {
            base = new URL(b, base).href;
        } catch {
            // ignore an unusable xml:base
        }
    }
    return base;
}

/**
 * Resolve a URL from a feed against its base. Returns null for empty values and
 * for javascript:, data: and vbscript: URLs.
 */
export function resolveUrl(value: string | null | undefined, base?: string): string | null {
    const raw = (value || "").trim();
    if (!raw) return null;
    // the URL parser ignores tabs and newlines, so do the same before checking the scheme
    const compact = raw.replace(/[\u0000- ]/g, "");
    if (UNSAFE_SCHEME.test(compact)) return null;
    if (!base) return raw;
    try {
        const href = new URL(raw, base).href;
        return UNSAFE_SCHEME.test(href) ? null : href;
    } catch {
        return raw;
    }
}

/** A stable id for an item with no guid and no usable link: title, date and position in the feed. */
export function fallbackGuid(title: string, pubDate: string | null, index: number): string {
    return `${title}|${pubDate ?? ""}#${index}`;
}

/** Origin plus pathname only, so tokens in the query string or userinfo stay out of messages. */
export function safeUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + u.pathname;
    } catch {
        return "the feed";
    }
}
