import { useEffect, useState } from "react";

const VISIBLE_MS = 2000;
const FADE_MS = 500;

export default function FadeAwayMessage({
  message,
  messageKey,
  onDismiss,
  className = "choice-saved",
}) {
  const [displayMessage, setDisplayMessage] = useState("");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!message) {
      setDisplayMessage("");
      setFading(false);
      return;
    }

    setDisplayMessage(message);
    setFading(false);

    const fadeTimer = window.setTimeout(() => setFading(true), VISIBLE_MS);
    const dismissTimer = window.setTimeout(() => {
      setDisplayMessage("");
      setFading(false);
      onDismiss?.();
    }, VISIBLE_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [message, messageKey, onDismiss]);

  if (!displayMessage) {
    return null;
  }

  return (
    <p
      className={`${className}${fading ? " choice-saved--fading" : ""}`}
      aria-live="polite"
    >
      {displayMessage}
    </p>
  );
}
