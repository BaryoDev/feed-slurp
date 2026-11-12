// src/fetcher.ts
import { resilientFetch } from "resilient-fetcher";
var DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
async function readBody(response, maxBytes, timeout) {
  const tooLarge = () => new Error(`Feed is larger than ${maxBytes} bytes`);
  const declared = Number(response.headers?.get?.("content-length"));
  if (declared > maxBytes) throw tooLarge();
  const reader = response.body?.getReader?.();
  let timer;
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timed out")), timeout);
  });
  const read = async () => {
    if (!reader) {
      const text2 = await response.text();
      if (text2.length > maxBytes) throw tooLarge();
      return text2;
    }
    const decoder = new TextDecoder();
    let text = "";
    let total = 0;
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw tooLarge();
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  };
  try {
    return await Promise.race([read(), timedOut]);
  } catch (err) {
    reader?.cancel().catch(() => {
    });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
async function fetchFeedXml(url, options = {}) {
  const { proxy, timeout = 1e4, retries = 3, maxBytes = DEFAULT_MAX_BYTES } = options;
  let requestUrl = url;
  if (proxy) {
    if (typeof proxy === "function") {
      requestUrl = proxy(url);
    } else {
      switch (proxy) {
        case "allorigins":
          requestUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          break;
        case "corsproxy":
          requestUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          break;
        default:
          requestUrl = `${proxy}${encodeURIComponent(url)}`;
      }
    }
  }
  let response;
  try {
    response = await resilientFetch(requestUrl, {
      retries,
      timeout
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch feed ${url}: ${message}`);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch feed ${url}: ${response.status} ${response.statusText}`.trim());
  }
  return readBody(response, maxBytes, timeout);
}

// src/parser/xml.ts
var LATIN1 = "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(" ");
var HTML_ENTITIES = {
  ensp: 8194,
  emsp: 8195,
  thinsp: 8201,
  zwnj: 8204,
  zwj: 8205,
  ndash: 8211,
  mdash: 8212,
  lsquo: 8216,
  rsquo: 8217,
  sbquo: 8218,
  ldquo: 8220,
  rdquo: 8221,
  bdquo: 8222,
  dagger: 8224,
  Dagger: 8225,
  bull: 8226,
  hellip: 8230,
  permil: 8240,
  prime: 8242,
  Prime: 8243,
  lsaquo: 8249,
  rsaquo: 8250,
  euro: 8364,
  trade: 8482,
  larr: 8592,
  rarr: 8594,
  uarr: 8593,
  darr: 8595,
  harr: 8596,
  minus: 8722,
  infin: 8734,
  ne: 8800,
  le: 8804,
  ge: 8805,
  OElig: 338,
  oelig: 339,
  Scaron: 352,
  scaron: 353,
  Yuml: 376,
  fnof: 402,
  circ: 710,
  tilde: 732
};
LATIN1.forEach((name, i) => {
  HTML_ENTITIES[name] = 160 + i;
});
var CDATA = /(<!\[CDATA\[[\s\S]*?\]\]>)/;
function replaceHtmlEntities(xml) {
  return xml.split(CDATA).map(
    (part, i) => i % 2 === 1 ? part : part.replace(
      /&([A-Za-z][A-Za-z0-9]*);/g,
      (match, name) => Object.prototype.hasOwnProperty.call(HTML_ENTITIES, name) ? `&#${HTML_ENTITIES[name]};` : match
    )
  ).join("");
}
function parseXml(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(replaceHtmlEntities(xmlString), "text/xml");
  const parseError = doc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error(`XML parsing failed: ${parseError[0].textContent}`);
  }
  return doc;
}
function findNode(parent, selector) {
  if (!parent) return null;
  try {
    const el2 = parent.querySelector(selector.replace(":", "\\:"));
    if (el2) return el2;
  } catch (e) {
  }
  if (selector.includes(":")) {
    const [prefix, localName2] = selector.split(":");
    const el2 = parent.getElementsByTagNameNS("*", localName2)[0];
    if (el2) return el2;
  }
  const localName = selector.includes(":") ? selector.split(":")[1] : selector;
  const el = parent.getElementsByTagName(localName)[0];
  return el || null;
}
function getText(node, selector) {
  const el = node instanceof Document ? findNode(node, selector) : findNode(node, selector);
  return el?.textContent?.trim() || "";
}
function getCDataOrText(node, selectors) {
  if (!node) return "";
  for (const selector of selectors) {
    const el = findNode(node, selector);
    if (el) return el.textContent?.trim() || "";
  }
  return "";
}

// src/parser/date.ts
function toIsoDate(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

// src/parser/text.ts
var UNSAFE_SCHEME = /^(javascript|data|vbscript):/i;
var XML_NS = "http://www.w3.org/XML/1998/namespace";
function htmlToText(html) {
  if (!html) return "";
  const stripped = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<[^>]+>/g, "");
  const doc = new DOMParser().parseFromString(stripped, "text/html");
  return (doc.body?.textContent || "").trim();
}
function xmlBase(el) {
  return el.getAttributeNS(XML_NS, "base") || el.getAttribute("xml:base");
}
function baseFor(el, feedUrl) {
  const bases = [];
  for (let node = el; node; node = node.parentElement) {
    const b = xmlBase(node);
    if (b) bases.unshift(b);
  }
  let base = feedUrl;
  for (const b of bases) {
    try {
      base = new URL(b, base).href;
    } catch {
    }
  }
  return base;
}
function resolveUrl(value, base) {
  const raw = (value || "").trim();
  if (!raw) return null;
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

// src/parser/rss.ts
function parseRss(doc, feedUrl) {
  const channel = doc.querySelector("channel");
  if (!channel) throw new Error("Invalid RSS feed: Missing <channel>");
  const items = Array.from(doc.querySelectorAll("item")).map((item) => {
    let description = htmlToText(getText(item, "description"));
    const content = getCDataOrText(item, ["content:encoded", "description", "summary"]);
    if (!description && content) {
      description = htmlToText(content).substring(0, 160).trim() + "...";
    }
    const linkEl = findNode(item, "link");
    const link = resolveUrl(getText(item, "link"), baseFor(linkEl, feedUrl)) ?? "";
    return {
      title: getText(item, "title"),
      link,
      pubDate: toIsoDate(getText(item, "pubDate")),
      description,
      content,
      author: getText(item, "dc\\:creator") || getText(item, "author") || "Unknown",
      categories: Array.from(item.querySelectorAll("category")).map((c) => c.textContent || ""),
      guid: getText(item, "guid") || link,
      thumbnail: extractThumbnail(item, content, feedUrl)
    };
  });
  return {
    title: getText(channel, "title"),
    description: htmlToText(getText(channel, "description")),
    link: resolveUrl(getText(channel, "link"), baseFor(findNode(channel, "link"), feedUrl)) ?? "",
    lastBuildDate: getText(channel, "lastBuildDate") || (/* @__PURE__ */ new Date()).toISOString(),
    items
  };
}
function extractThumbnail(item, content, feedUrl) {
  const base = baseFor(item, feedUrl);
  const mediaTags = ["media\\:content", "media\\:thumbnail", "content", "thumbnail"];
  for (const tag of mediaTags) {
    const el = findNode(item, tag);
    if (el) {
      const url = el.getAttribute("url") || el.getAttribute("src");
      if (url) return resolveUrl(url, baseFor(el, feedUrl));
    }
  }
  const enclosure = item.querySelector("enclosure[type^='image']");
  if (enclosure) {
    const url = enclosure.getAttribute("url");
    if (url) return resolveUrl(url, baseFor(enclosure, feedUrl));
  }
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const match = content.match(imgRegex);
  if (match && match[1]) return resolveUrl(match[1], base);
  return null;
}

// src/parser/atom.ts
function alternateLink(parent, feedUrl) {
  const links = Array.from(parent.children).filter((c) => c.localName === "link" && c.getAttribute("href"));
  const link = links.find((l) => l.getAttribute("rel") === "alternate") || links.find((l) => !l.hasAttribute("rel") || l.getAttribute("rel") === "");
  return link ? resolveUrl(link.getAttribute("href"), baseFor(link, feedUrl)) ?? "" : "";
}
function parseAtom(doc, feedUrl) {
  const feed = doc.querySelector("feed");
  if (!feed) throw new Error("Invalid Atom feed: Missing <feed>");
  const items = Array.from(doc.querySelectorAll("entry")).map((entry) => {
    const content = getText(entry, "content") || getText(entry, "summary");
    return {
      title: getText(entry, "title"),
      link: alternateLink(entry, feedUrl),
      pubDate: toIsoDate(getText(entry, "updated")) ?? toIsoDate(getText(entry, "published")),
      description: htmlToText(getText(entry, "summary")),
      content,
      author: getText(entry, "author name") || "Unknown",
      categories: Array.from(entry.querySelectorAll("category")).map((c) => c.getAttribute("term") || ""),
      guid: getText(entry, "id"),
      thumbnail: extractThumbnail2(entry, content, feedUrl)
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
function extractThumbnail2(entry, content, feedUrl) {
  const enclosure = entry.querySelector("link[rel='enclosure'][type^='image']");
  if (enclosure) return resolveUrl(enclosure.getAttribute("href"), baseFor(enclosure, feedUrl));
  const match = content.match(/<img[^>]+src="([^">]+)"/);
  return match ? resolveUrl(match[1], baseFor(entry, feedUrl)) : null;
}

// src/cache.ts
import { createStorage } from "nano-safe-storage";
var storage = createStorage({
  prefix: "slurp_",
  ttl: 3600
  // Default 1 hour
});
function getCachedFeed(key) {
  return storage.get(key);
}
function setCachedFeed(key, feed, ttl) {
  if (ttl !== void 0 && ttl <= 0) return;
  storage.set(key, feed, ttl !== void 0 ? { ttl } : void 0);
}
function clearSlurpCache(key) {
  if (key) {
    storage.remove(key);
  } else {
    storage.clear();
  }
}

// src/index.ts
async function slurp(url, options = {}) {
  const { cache = true, cacheTTL, cacheKey = url } = options;
  const useCache = cache && !(cacheTTL !== void 0 && cacheTTL <= 0);
  if (useCache) {
    const cached = getCachedFeed(cacheKey);
    if (cached) return cached;
  }
  const xml = await fetchFeedXml(url, options);
  const doc = parseXml(xml);
  const isAtom = doc.querySelector("feed") !== null;
  const feed = isAtom ? parseAtom(doc, url) : parseRss(doc, url);
  if (useCache) {
    setCachedFeed(cacheKey, feed, cacheTTL);
  }
  return feed;
}
function createSlurper(defaultOptions = {}) {
  return {
    slurp: (url, options = {}) => slurp(url, { ...defaultOptions, ...options }),
    clearCache: (key) => clearSlurpCache(key)
  };
}
export {
  clearSlurpCache,
  createSlurper,
  slurp
};
