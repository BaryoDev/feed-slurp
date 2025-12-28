import { describe, it, expect } from "vitest";
import { parseXml, getText, getCDataOrText } from "./xml";

describe("XML Utils", () => {
    it("should parse valid XML string", () => {
        const xml = "<root><child>Hello</child></root>";
        const doc = parseXml(xml);
        expect(doc.querySelector("child")?.textContent).toBe("Hello");
    });

    it("should throw error on invalid XML", () => {
        const xml = "<root><child>Hello</child>"; // Missing closing tag
        expect(() => parseXml(xml)).toThrow();
    });

    it("should get text content cleanly", () => {
        const xml = "<item><title> Hello World </title></item>";
        const doc = parseXml(xml);
        expect(getText(doc.documentElement, "title")).toBe("Hello World");
    });

    it("should handle namespaced tags for CDATA", () => {
        const xml = `
      <item xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <content:encoded><![CDATA[<p>Full content</p>]]></content:encoded>
      </item>
    `;
        const doc = parseXml(xml);
        expect(getCDataOrText(doc.documentElement, ["content:encoded"])).toBe("<p>Full content</p>");
    });
});
