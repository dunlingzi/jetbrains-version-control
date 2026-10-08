/** Anything that carries a key + modifier state (DOM or React synthetic). */
type KeyLike = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/**
 * True only for a bare Arrow Up / Arrow Down press.
 *
 * Arrow navigation must ignore modified presses: the browser reports
 * `Cmd+ArrowDown` as `key === "ArrowDown"`, so an unguarded handler swallows
 * shortcuts like Cmd+Down and moves the selection instead. Because some of these
 * handlers are attached at `document` level, the damage is not limited to the
 * list that owns them.
 */
export function isPlainArrowKey(e: KeyLike): boolean {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return false;
  return !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
}
