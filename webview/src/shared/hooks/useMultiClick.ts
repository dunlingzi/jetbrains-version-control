import { useCallback, useEffect, useRef } from "react";

/**
 * Window used to collapse a multi-click sequence. Matches the platform
 * double-click interval (Chromium / macOS `NSEvent.doubleClickInterval` /
 * Windows all use ~500ms) so it feels native.
 */
export const MULTI_CLICK_THRESHOLD = 500;

/** Map of click count -> handler. Callers define only the counts they care about. */
export type MultiClickHandlers<E> = {
  [clickCount: number]: ((event: E) => void) | undefined;
};

/**
 * Resolves the handler for a click count, falling back to the closest lower
 * count that is defined. A caller registering {1, 2} therefore treats a triple
 * click as a double click instead of silently doing nothing.
 */
function resolveHandler<E>(
  handlers: MultiClickHandlers<E>,
  count: number,
): ((event: E) => void) | undefined {
  for (let c = count; c >= 1; c--) {
    const candidate = handlers[c];
    if (candidate) return candidate;
  }
  return undefined;
}

/**
 * Distinguishes single / double / triple (and beyond) clicks on the same element.
 *
 * There is no `tripleclick` DOM event: `dblclick` fires on the 2nd click, before
 * we know whether a 3rd is coming. So single clicks fire immediately, while any
 * higher count is deferred until `threshold` elapses without a further click,
 * letting the highest count in the sequence win.
 */
export function useMultiClick<E extends React.MouseEvent>(
  handlers: MultiClickHandlers<E>,
  threshold: number = MULTI_CLICK_THRESHOLD,
): (event: E) => void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<E | null>(null);

  const clearPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  useEffect(() => clearPending, [clearPending]);

  return useCallback(
    (event: E) => {
      const count = event.detail > 0 ? event.detail : 1;

      if (count === 1) {
        clearPending();
        handlersRef.current[1]?.(event);
        return;
      }

      clearPending();
      pendingRef.current = event;
      timerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        timerRef.current = null;
        pendingRef.current = null;
        if (!pending) return;
        resolveHandler(handlersRef.current, count)?.(pending);
      }, threshold);
    },
    [clearPending, threshold],
  );
}
