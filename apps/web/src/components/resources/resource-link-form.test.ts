import { describe, expect, it } from "vite-plus/test";
import {
  formFromLink,
  getFormIssue,
  normalizeUrl,
  toFields,
} from "./resource-link-form";

describe("normalizeUrl", () => {
  it.each([
    [
      "drive.google.com/drive/folders/1",
      "https://drive.google.com/drive/folders/1",
    ],
    ["  figma.com/file/abc  ", "https://figma.com/file/abc"],
    ["localhost:3000/board", "https://localhost:3000/board"],
    ["http://example.com", "http://example.com"],
    ["HTTPS://Example.com", "HTTPS://Example.com"],
    ["javascript:alert(1)", "javascript:alert(1)"],
    ["mailto:team@example.com", "mailto:team@example.com"],
    ["", ""],
  ])("turns %j into %j", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });
});

describe("getFormIssue", () => {
  const valid = {
    title: "Brand",
    url: "figma.com/file",
    description: "",
    emoji: "",
  };

  it("accepts a title with a web address", () => {
    expect(getFormIssue(valid)).toBeNull();
  });

  it("asks for a title first, then a web address", () => {
    expect(getFormIssue({ ...valid, title: "  " })).toBe("title");
    expect(getFormIssue({ ...valid, url: "" })).toBe("url");
    expect(getFormIssue({ ...valid, url: "javascript:alert(1)" })).toBe("url");
    expect(getFormIssue({ ...valid, url: "ftp://example.com" })).toBe("url");
  });
});

describe("toFields", () => {
  it("trims text and turns blanks into null", () => {
    expect(
      toFields({
        title: " Brand ",
        url: "figma.com",
        description: " ",
        emoji: " 🎨 ",
      }),
    ).toEqual({
      title: "Brand",
      url: "https://figma.com",
      description: null,
      emoji: "🎨",
    });
  });

  it("round-trips an existing link", () => {
    const form = formFromLink({
      id: "1",
      workspaceId: "w",
      projectId: null,
      title: "Docs",
      url: "https://docs.example.com",
      description: "Handbook",
      emoji: null,
      position: 0,
      createdAt: "",
      updatedAt: "",
    });
    expect(toFields(form)).toEqual({
      title: "Docs",
      url: "https://docs.example.com",
      description: "Handbook",
      emoji: null,
    });
  });
});
