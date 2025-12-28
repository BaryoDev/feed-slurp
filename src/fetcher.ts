import { resilientFetch } from "resilient-fetcher";
import { SlurpOptions } from "./types";

export async function fetchFeedXml(url: string, options: SlurpOptions = {}): Promise<string> {
    const { proxy, timeout = 10000, retries = 3 } = options;

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

    const response = await resilientFetch(requestUrl, {
        retries,
        timeout,
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
    }

    return response.text();
}
