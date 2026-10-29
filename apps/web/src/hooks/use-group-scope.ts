import { useCallback, useSyncExternalStore } from "react";

export type GroupScope = "own" | "everything";

const DEFAULT_SCOPE: GroupScope = "everything";
const listeners = new Set<() => void>();
// Covers a browser whose storage throws: the choice still holds for the
// session and is shared by every view of the parent.
const memory = new Map<string, GroupScope>();

const storageKey = (parentId: string) => `kaneo:group-scope:${parentId}`;

function readScope(parentId: string): GroupScope {
  const remembered = memory.get(parentId);
  if (remembered) return remembered;
  try {
    const raw = window.localStorage.getItem(storageKey(parentId));
    return raw === "own" || raw === "everything" ? raw : DEFAULT_SCOPE;
  } catch {
    return DEFAULT_SCOPE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (!event.key?.startsWith("kaneo:group-scope:")) return;
    memory.delete(event.key.slice("kaneo:group-scope:".length));
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** "Own only" / "Everything" for a parent project, shared by all its views. */
export function useGroupScope(
  parentId: string,
): [GroupScope, (scope: GroupScope) => void] {
  const scope = useSyncExternalStore(
    subscribe,
    () => readScope(parentId),
    () => DEFAULT_SCOPE,
  );
  const setScope = useCallback(
    (next: GroupScope) => {
      memory.set(parentId, next);
      try {
        window.localStorage.setItem(storageKey(parentId), next);
      } catch {}
      for (const listener of listeners) listener();
    },
    [parentId],
  );
  return [scope, setScope];
}
