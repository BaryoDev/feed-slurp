"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  clearSlurpCache: () => clearSlurpCache,
  createSlurper: () => createSlurper,
  slurp: () => slurp
});
module.exports = __toCommonJS(index_exports);

// src/fetcher.ts
var import_resilient_fetcher = require("resilient-fetcher");
async function fetchFeedXml(url, options = {}) {
  const { proxy, timeout = 1e4, retries = 3 } = options;
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
  const response = await (0, import_resilient_fetcher.resilientFetch)(requestUrl, {
    retries,
    timeout
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// src/parser/xml.ts
function parseXml(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  const parseError = doc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error(`XML parsing failed: ${parseError[0].textContent}`);
  }
  return doc;
}
function getText(node, selector) {
  if (!node) return "";
  const el = node.querySelector(selector);
  return el?.textContent?.trim() || "";
}
function getCDataOrText(node, selectors) {
  if (!node) return "";
  for (const selector of selectors) {
    const el = node.querySelector(selector.replace(":", "\\:"));
    if (el) return el.textContent?.trim() || "";
  }
  return "";
}

// src/parser/rss.ts
function parseRss(doc) {
  const channel = doc.querySelector("channel");
  if (!channel) throw new Error("Invalid RSS feed: Missing <channel>");
  const items = Array.from(doc.querySelectorAll("item")).map((item) => {
    const description = getText(item, "description");
    const content = getCDataOrText(item, ["content:encoded", "description"]);
    return {
      title: getText(item, "title"),
      link: getText(item, "link"),
      pubDate: new Date(getText(item, "pubDate")).toISOString(),
      description,
      content,
      author: getText(item, "dc\\:creator") || "Unknown",
      categories: Array.from(item.querySelectorAll("category")).map((c) => c.textContent || ""),
      guid: getText(item, "guid") || getText(item, "link"),
      thumbnail: extractThumbnail(item, content)
    };
  });
  return {
    title: getText(channel, "title"),
    description: getText(channel, "description"),
    link: getText(channel, "link"),
    lastBuildDate: getText(channel, "lastBuildDate") || (/* @__PURE__ */ new Date()).toISOString(),
    items
  };
}
function extractThumbnail(item, content) {
  const media = item.querySelector("media\\:content, media\\:thumbnail, enclosure[type^='image']");
  if (media) {
    return media.getAttribute("url") || media.getAttribute("src");
  }
  const match = content.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

// src/parser/atom.ts
function parseAtom(doc) {
  const feed = doc.querySelector("feed");
  if (!feed) throw new Error("Invalid Atom feed: Missing <feed>");
  const items = Array.from(doc.querySelectorAll("entry")).map((entry) => {
    const content = getText(entry, "content") || getText(entry, "summary");
    return {
      title: getText(entry, "title"),
      link: entry.querySelector("link[rel='alternate']")?.getAttribute("href") || entry.querySelector("link")?.getAttribute("href") || "",
      pubDate: new Date(getText(entry, "updated") || getText(entry, "published")).toISOString(),
      description: getText(entry, "summary"),
      content,
      author: getText(entry, "author name") || "Unknown",
      categories: Array.from(entry.querySelectorAll("category")).map((c) => c.getAttribute("term") || ""),
      guid: getText(entry, "id"),
      thumbnail: extractThumbnail2(entry, content)
    };
  });
  return {
    title: getText(feed, "title"),
    description: getText(feed, "subtitle") || "",
    link: feed.querySelector("link[rel='alternate']")?.getAttribute("href") || feed.querySelector("link")?.getAttribute("href") || "",
    lastBuildDate: getText(feed, "updated"),
    items
  };
}
function extractThumbnail2(entry, content) {
  const enclosure = entry.querySelector("link[rel='enclosure'][type^='image']");
  if (enclosure) return enclosure.getAttribute("href");
  const match = content.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

// src/cache.ts
var import_nano_safe_storage = require("nano-safe-storage");
var storage = (0, import_nano_safe_storage.createStorage)({
  prefix: "slurp_",
  ttl: 3600
  // Default 1 hour
});
function getCachedFeed(key) {
  return storage.get(key);
}
function setCachedFeed(key, feed, ttl) {
  storage.set(key, feed, ttl ? { ttl } : void 0);
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
  if (cache) {
    const cached = getCachedFeed(cacheKey);
    if (cached) return cached;
  }
  const xml = await fetchFeedXml(url, options);
  const doc = parseXml(xml);
  const isAtom = doc.querySelector("feed") !== null;
  const feed = isAtom ? parseAtom(doc) : parseRss(doc);
  if (cache) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clearSlurpCache,
  createSlurper,
  slurp
});
