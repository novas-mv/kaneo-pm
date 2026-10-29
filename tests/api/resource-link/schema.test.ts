import { describe, expect, it } from "vite-plus/test";
import {
  createResourceLinkBody,
  reorderResourceLinksBody,
  updateResourceLinkBody,
} from "../../../apps/api/src/resource-link/schema";

describe("resource link body validation", () => {
  it.each([
    "http://example.com",
    "https://drive.google.com/drive/folders/abc?usp=sharing",
  ])("accepts %s", (url) => {
    expect(
      createResourceLinkBody.safeParse({ title: "Docs", url }).success,
    ).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "ftp://example.com",
    "mailto:team@example.com",
    "example.com",
    "",
  ])("rejects %s", (url) => {
    expect(
      createResourceLinkBody.safeParse({ title: "Docs", url }).success,
    ).toBe(false);
  });

  it("requires a non-blank title and trims text", () => {
    expect(
      createResourceLinkBody.safeParse({ title: "   ", url: "https://a.co" })
        .success,
    ).toBe(false);
    expect(
      createResourceLinkBody.parse({
        title: "  Brand  ",
        url: " https://a.co ",
        description: "  ",
        emoji: " 📁 ",
      }),
    ).toEqual({
      title: "Brand",
      url: "https://a.co",
      description: null,
      emoji: "📁",
    });
  });

  it("requires something to change on update", () => {
    expect(updateResourceLinkBody.safeParse({}).success).toBe(false);
    expect(updateResourceLinkBody.safeParse({ emoji: null }).success).toBe(
      true,
    );
  });

  it("caps reorder requests", () => {
    const ids = Array.from({ length: 101 }, (_, index) => `id-${index}`);
    expect(reorderResourceLinksBody.safeParse({ ids }).success).toBe(false);
  });
});
