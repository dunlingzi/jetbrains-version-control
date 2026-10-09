import { useEffect } from "react";
import { bridge } from "../bridge";

/**
 * Publishes whether this webview currently has focus into a when-clause context
 * key, so keybindings declared in package.json can be scoped to the panel.
 *
 * VS Code sets `focusedView` only for views it owns the DOM for; a contributed
 * `type: "webview"` view never matches it, so extensions have to drive their own
 * key. Pair with `when: "<key> || ..."` in `contributes.keybindings`.
 */
export function useFocusContextKey(key: string): void {
  useEffect(() => {
    let current: boolean | undefined;

    const publish = (value: boolean) => {
      if (current === value) return;
      current = value;
      void bridge.request("setContext", { key, value });
    };

    publish(document.hasFocus());
    window.addEventListener("focus", () => publish(true));
    window.addEventListener("blur", () => publish(false));

    return () => {
      publish(false);
    };
  }, [key]);
}
