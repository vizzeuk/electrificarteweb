"use client";

import { useState, useCallback } from "react";

const MAX_COMPARE = 3;

export function useCompareStore() {
  const [slugs, setSlugs] = useState<string[]>([]);

  const add = useCallback((slug: string) => {
    setSlugs((prev) => {
      if (prev.includes(slug) || prev.length >= MAX_COMPARE) return prev;
      return [...prev, slug];
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSlugs((prev) => prev.filter((s) => s !== slug));
  }, []);

  const clear = useCallback(() => setSlugs([]), []);

  const isSelected = useCallback(
    (slug: string) => slugs.includes(slug),
    [slugs]
  );

  const isFull = slugs.length >= MAX_COMPARE;

  return { slugs, add, remove, clear, isSelected, isFull, count: slugs.length };
}
