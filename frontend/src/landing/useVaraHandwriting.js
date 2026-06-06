import { useEffect, useId, useRef, useState } from "react";
import Vara from "vara/src/vara.min.js";

/**
 * Mount a Vara stroke-drawing animation inside a container ref.
 * Cleans up on unmount and when `enabled` is false.
 */
export function useVaraHandwriting({ enabled = true, fontUrl, texts, options = {} }) {
  const containerRef = useRef(null);
  const elementId = useId().replace(/:/g, "");
  const textsKey = JSON.stringify(texts);
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container || !fontUrl || !texts?.length) {
      return undefined;
    }

    container.id = `vara-${elementId}`;
    container.replaceChildren();

    const instance = new Vara(`#vara-${elementId}`, fontUrl, texts, options);

    return () => {
      container.replaceChildren();
      void instance;
    };
  }, [enabled, elementId, fontUrl, textsKey, optionsKey, texts, options]);

  return containerRef;
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setPrefersReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

export function useTaglineFontSize() {
  const query = "(min-width: 641px)";
  const [fontSize, setFontSize] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(query).matches ? 48 : 22,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event) => setFontSize(event.matches ? 48 : 22);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return fontSize;
}

export function useNamesFontSize() {
  const query = "(min-width: 641px)";
  const [fontSize, setFontSize] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(query).matches ? 56 : 30,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event) => setFontSize(event.matches ? 56 : 30);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return fontSize;
}
