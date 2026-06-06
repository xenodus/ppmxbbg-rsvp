import { spriteImg } from "./images.js";

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

/**
 * Wait for above-the-fold fonts and the hero sprite before revealing the page.
 * Falls back after `timeoutMs` so slow networks are not blocked indefinitely.
 */
export function waitForLandingAssets({ timeoutMs = 5000 } = {}) {
  const assetsReady = Promise.all([document.fonts.ready, preloadImage(spriteImg)]);

  const timeout = new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });

  return Promise.race([assetsReady, timeout]);
}
