export function parseXml(xmlString: string): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");

    const parseError = doc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
        throw new Error(`XML parsing failed: ${parseError[0].textContent}`);
    }

    return doc;
}

export function findNode(parent: Element | Document | null, selector: string): Element | null {
    if (!parent) return null;

    // 1. Try querySelector (standard)
    try {
        const el = parent.querySelector(selector.replace(":", "\\:"));
        if (el) return el;
    } catch (e) {
        // Ignore selector errors
    }

    // 2. Try getElementsByTagNameNS for namespaced selector (e.g. "content:encoded")
    if (selector.includes(":")) {
        const [prefix, localName] = selector.split(":");
        const el = parent.getElementsByTagNameNS("*", localName)[0];
        if (el) return el;
    }

    // 3. Try plain local name as fallback
    const localName = selector.includes(":") ? selector.split(":")[1] : selector;
    const el = parent.getElementsByTagName(localName)[0];
    return el || null;
}

export function getText(node: Element | Document | null, selector: string): string {
    const el = node instanceof Document ? findNode(node, selector) : findNode(node as Element, selector);
    return el?.textContent?.trim() || "";
}

export function getCDataOrText(node: Element | null, selectors: string[]): string {
    if (!node) return "";
    for (const selector of selectors) {
        const el = findNode(node, selector);
        if (el) return el.textContent?.trim() || "";
    }
    return "";
}

export function getAttributes(node: Element | null, selector: string, attr: string): string {
    const el = findNode(node, selector);
    return el?.getAttribute(attr) || "";
}
