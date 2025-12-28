export function parseXml(xmlString: string): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");

    const parseError = doc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
        throw new Error(`XML parsing failed: ${parseError[0].textContent}`);
    }

    return doc;
}

export function getText(node: Element | Document | null, selector: string): string {
    if (!node) return "";
    const el = node.querySelector(selector);
    return el?.textContent?.trim() || "";
}

export function getCDataOrText(node: Element | null, selectors: string[]): string {
    if (!node) return "";
    for (const selector of selectors) {
        // Handling namespaced selectors like content:encoded
        const el = node.querySelector(selector.replace(":", "\\:"));
        if (el) return el.textContent?.trim() || "";
    }
    return "";
}

export function getAttributes(node: Element | null, selector: string, attr: string): string {
    if (!node) return "";
    const el = node.querySelector(selector);
    return el?.getAttribute(attr) || "";
}
