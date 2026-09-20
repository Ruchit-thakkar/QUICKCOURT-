"use client";

import { useCallback, useEffect, useState } from "react";
import type { AsyncState } from "@/types";

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<AsyncState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await fetcher();
      const empty =
        result == null ||
        (Array.isArray(result) && result.length === 0);
      setData(result);
      setState(empty ? "empty" : "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, state, error, reload: load };
}
