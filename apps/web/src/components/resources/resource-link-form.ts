import type {
  ResourceLink,
  ResourceLinkFields,
} from "@/fetchers/resource-link";

export type ResourceLinkForm = {
  title: string;
  url: string;
  description: string;
  emoji: string;
};

export type ResourceLinkIssue = "title" | "url";

export function formFromLink(link: ResourceLink | null): ResourceLinkForm {
  return {
    title: link?.title ?? "",
    url: link?.url ?? "",
    description: link?.description ?? "",
    emoji: link?.emoji ?? "",
  };
}

// Pasted addresses often lack a scheme ("drive.google.com/…"). Other schemes
// (javascript:, mailto:) are kept so validation rejects them; "host:8080"
// is a port, not a scheme.
export function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value || /^https?:\/\//i.test(value)) return value;
  const hasScheme =
    /^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[^/]*:\d+(\/|$)/.test(value);
  return hasScheme ? value : `https://${value}`;
}

export function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function getFormIssue(form: ResourceLinkForm): ResourceLinkIssue | null {
  if (!form.title.trim()) return "title";
  if (!isHttpUrl(normalizeUrl(form.url))) return "url";
  return null;
}

export function toFields(form: ResourceLinkForm): ResourceLinkFields {
  return {
    title: form.title.trim(),
    url: normalizeUrl(form.url),
    description: form.description.trim() || null,
    emoji: form.emoji.trim() || null,
  };
}
