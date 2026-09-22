"use client";

import { useEffect, useRef, useState } from "react";

/** The rendered width of an element, tracked.
 *
 *  Charts here are drawn in real pixels rather than in a stretched viewBox: a
 *  `preserveAspectRatio="none"` SVG scales its strokes and turns every dot
 *  into an ellipse, which breaks the one thing the mark specs are for. Width
 *  starts at 0, so callers hold the frame until it is known instead of drawing
 *  a chart that jumps on the next frame. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth((current) => (Math.abs(current - next) > 0.5 ? next : current));
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
