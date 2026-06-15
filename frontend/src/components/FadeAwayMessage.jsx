export default function FadeAwayMessage({
  message,
  className = "choice-saved",
}) {
  if (!message) {
    return null;
  }

  return (
    <p className={className} aria-live="polite">
      {message}
    </p>
  );
}
