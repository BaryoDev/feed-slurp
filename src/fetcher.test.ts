import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("resilient-fetcher", () => ({ resilientFetch: vi.fn() }));

import { resilientFetch } from "resilient-fetcher";
import { fetchFeedXml } from "./fetcher";

const mocked = vi.mocked(resilientFetch);

function bodyResponse(chunks: Uint8Array[], opts: { hang?: boolean; ok?: boolean; status?: number } = {}) {
    let i = 0;
    return {
        ok: opts.ok ?? true,
        status: opts.status ?? 200,
        statusText: "",
        headers: { get: () => null },
        body: {
            getReader: () => ({
                read: () =>
                    i < chunks.length
                        ? Promise.resolve({ done: false, value: chunks[i++] })
                        : opts.hang
                          ? new Promise(() => {})
                          : Promise.resolve({ done: true, value: undefined }),
                cancel: () => Promise.resolve(),
            }),
        },
    } as unknown as Response;
}

describe("fetchFeedXml", () => {
    beforeEach(() => {
        mocked.mockReset();
    });

    it("reads the body", async () => {
        mocked.mockResolvedValue(bodyResponse([new TextEncoder().encode("<rss/>")]));
        expect(await fetchFeedXml("https://x/f")).toBe("<rss/>");
    });

    it("throws when the response is not ok", async () => {
        mocked.mockResolvedValue(bodyResponse([], { ok: false, status: 404 }));
        await expect(fetchFeedXml("https://x/f")).rejects.toThrow(/404/);
    });

    it("names the url when the request fails", async () => {
        mocked.mockRejectedValue(new Error("Request failed with status 500"));
        await expect(fetchFeedXml("https://x/f")).rejects.toThrow(/https:\/\/x\/f.*status 500/);
    });

    it("times out when the body never ends", async () => {
        mocked.mockResolvedValue(bodyResponse([new Uint8Array([60])], { hang: true }));
        await expect(fetchFeedXml("https://x/f", { timeout: 30 })).rejects.toThrow(/timed out/);
    });

    it("stops reading past maxBytes", async () => {
        mocked.mockResolvedValue(bodyResponse([new Uint8Array(600), new Uint8Array(600)]));
        await expect(fetchFeedXml("https://x/f", { maxBytes: 1000 })).rejects.toThrow(/larger than 1000/);
    });

    it("rejects a declared content-length over maxBytes", async () => {
        const res = bodyResponse([]) as any;
        res.headers = { get: () => "5000" };
        mocked.mockResolvedValue(res);
        await expect(fetchFeedXml("https://x/f", { maxBytes: 1000 })).rejects.toThrow(/larger than 1000/);
    });

    it("keeps the query string and userinfo out of error messages", async () => {
        mocked.mockRejectedValue(new Error("boom"));
        const err = await fetchFeedXml("https://user:pw@x.test/f.xml?token=SECRET").catch((e) => e);

        expect(err.message).toContain("https://x.test/f.xml");
        expect(err.message).not.toMatch(/SECRET|user|pw@/);
    });
});
