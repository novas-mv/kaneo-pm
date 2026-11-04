import { i18n } from "@/lib/i18n";

// The stored name of a personal project is English only. Fall back to it, not
// to the raw key, if the navigation namespace hasn't finished loading yet.
export function personalLabel() {
  return i18n.t("navigation:sidebar.personal", { defaultValue: "Personal" });
}
