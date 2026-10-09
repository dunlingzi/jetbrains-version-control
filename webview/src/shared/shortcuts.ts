import { useConfig } from "./hooks/useConfig";

/**
 * Label rendered beside Jump to Source / Edit Source in the context menus.
 *
 * The default matches the `f4` binding in `contributes.keybindings`. Webview
 * menus are drawn by us, so VS Code cannot inject the user's own binding here —
 * it is configurable via `jgc.shortcut.jumpToSourceLabel` instead.
 */
export function useJumpToSourceShortcutLabel(): string {
  return useConfig<string>("jgc.shortcut.jumpToSourceLabel", "F4");
}
