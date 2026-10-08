import { useEffect, useState } from "react";
import { bridge } from "../bridge";

/**
 * Reads a configuration value into the webview.
 *
 * Webviews have no access to the configuration service, so anything they need
 * to reflect (labels, defaults) has to be fetched through the bridge.
 */
export function useConfig<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    let cancelled = false;
    void bridge
      .request("getConfig", { key })
      .then((result) => {
        if (!cancelled && result !== undefined) {
          setValue(result as T);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  return value;
}
