import { resilientFetch } from "resilient-fetcher";
import { SlurpOptions } from "./types";
import { safeUrl } from "./parser/text";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

async function readBody(response: Response, maxBytes: number, timeout: number): Promise<string> {
    const tooLarge = () => new Error(`Feed is larger than ${maxBytes} bytes`);
    const declared = Number(response.headers?.get?.("content-length"));
    if (declared > maxBytes) throw tooLarge();

    const reader = response.body?.getReader?.();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Request timed out")), timeout);
    });

    const read = async (): Promise<string> => {
        if (!reader) {
            const text = await response.text();
            if (text.length > maxBytes) throw tooLarge();
            return text;
        }
        const decoder = new TextDecoder();
        let text = "";
        let total = 0;
        for (;;) {
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
        reader?.cancel().catch(() => {});
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export async function fetchFeedXml(url: string, options: SlurpOptions = {}): Promise<string> {
    const { proxy, timeout = 10000, retries = 3, maxBytes = DEFAULT_MAX_BYTES } = options;

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

    let response: Response;
    try {
        response = await resilientFetch(requestUrl, {
            retries,
            timeout,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to fetch feed ${safeUrl(url)}: ${message}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch feed ${safeUrl(url)}: ${response.status} ${response.statusText}`.trim());
    }

    return readBody(response, maxBytes, timeout);
}
