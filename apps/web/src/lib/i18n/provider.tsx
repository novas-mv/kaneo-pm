import { type PropsWithChildren, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import {
  getBrowserLocale,
  i18n,
  preloadNamespaces,
  resolveLocale,
} from "./index";

export function AppI18nProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const resolvedLocale = useMemo(
    () => resolveLocale(user?.locale, getBrowserLocale()),
    [user?.locale],
  );

  useEffect(() => {
    void i18n
      .changeLanguage(resolvedLocale)
      .then(() => preloadNamespaces(resolvedLocale))
      .then(() => {
        // The fetchers bake the translated personal project name into cached
        // data; refetch so it follows the language.
        for (const queryKey of [["projects"], ["assigned-tasks"], ["search"]]) {
          void queryClient.invalidateQueries({ queryKey });
        }
      });
    document.documentElement.lang = resolvedLocale;
  }, [resolvedLocale, queryClient]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
