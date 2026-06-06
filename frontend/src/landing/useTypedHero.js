import { useEffect, useRef, useState } from "react";
import Typed from "typed.js";

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

/**
 * Type couple names, then the tagline, using Typed.js.
 */
export function useTypedHero({ names, tagline, enabled = true }) {
  const namesRef = useRef(null);
  const taglineRef = useRef(null);

  useEffect(() => {
    if (!enabled || !namesRef.current || !taglineRef.current) {
      return undefined;
    }

    const namesEl = namesRef.current;
    const taglineEl = taglineRef.current;
    namesEl.textContent = "";
    taglineEl.textContent = "";

    let taglineTyped;

    const namesTyped = new Typed(namesEl, {
      strings: [names],
      typeSpeed: 90,
      showCursor: false,
      contentType: "null",
      onComplete: () => {
        taglineTyped = new Typed(taglineEl, {
          strings: [tagline],
          typeSpeed: 70,
          showCursor: false,
          contentType: "null",
        });
      },
    });

    return () => {
      namesTyped.destroy();
      taglineTyped?.destroy();
      namesEl.textContent = "";
      taglineEl.textContent = "";
    };
  }, [enabled, names, tagline]);

  return { namesRef, taglineRef };
}
