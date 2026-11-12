const LATIN1 = (
    "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest " +
    "Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig " +
    "agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml"
).split(" ");

const HTML_ENTITIES: Record<string, number> = {
    ensp: 8194, emsp: 8195, thinsp: 8201, zwnj: 8204, zwj: 8205,
    ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218,
    ldquo: 8220, rdquo: 8221, bdquo: 8222, dagger: 8224, Dagger: 8225,
    bull: 8226, hellip: 8230, permil: 8240, prime: 8242, Prime: 8243,
    lsaquo: 8249, rsaquo: 8250, euro: 8364, trade: 8482, larr: 8592,
    rarr: 8594, uarr: 8593, darr: 8595, harr: 8596, minus: 8722, infin: 8734,
    ne: 8800, le: 8804, ge: 8805, OElig: 338, oelig: 339, Scaron: 352,
    scaron: 353, Yuml: 376, fnof: 402, circ: 710, tilde: 732,
};
LATIN1.forEach((name, i) => {
    HTML_ENTITIES[name] = 160 + i;
});

const CDATA = /(<!\[CDATA\[[\s\S]*?\]\]>)/;

/** Replace HTML named entities that XML does not define with numeric references, outside CDATA. */
export function replaceHtmlEntities(xml: string): string {
    return xml
        .split(CDATA)
        .map((part, i) =>
            i % 2 === 1
                ? part
                : part.replace(/&([A-Za-z][A-Za-z0-9]*);/g, (match, name: string) =>
                      Object.prototype.hasOwnProperty.call(HTML_ENTITIES, name) ? `&#${HTML_ENTITIES[name]};` : match
                  )
        )
        .join("");
}

export function parseXml(xmlString: string): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(replaceHtmlEntities(xmlString), "text/xml");

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
