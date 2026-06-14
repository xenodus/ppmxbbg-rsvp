import { useCallback, useState } from "react";
import { spriteImg } from "./images.js";

export default function LandingSprite() {
  const [replayKey, setReplayKey] = useState(0);
  const [canReplay, setCanReplay] = useState(false);

  const handleAnimationEnd = useCallback((event) => {
    if (event.animationName === "landing-sprite-play") {
      setCanReplay(true);
    }
  }, []);

  const handleReplay = useCallback(() => {
    if (!canReplay) {
      return;
    }

    setCanReplay(false);
    setReplayKey((key) => key + 1);
  }, [canReplay]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!canReplay) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleReplay();
      }
    },
    [canReplay, handleReplay],
  );

  return (
    <div
      key={replayKey}
      className={`landing-sprite${canReplay ? " landing-sprite--replayable" : ""}`}
      style={{ backgroundImage: `url(${spriteImg})` }}
      role={canReplay ? "button" : "img"}
      aria-label={
        canReplay
          ? "Replay wedding invitation animation"
          : "Animated wedding invitation illustration"
      }
      tabIndex={canReplay ? 0 : undefined}
      onAnimationEnd={handleAnimationEnd}
      onClick={canReplay ? handleReplay : undefined}
      onKeyDown={canReplay ? handleKeyDown : undefined}
    />
  );
}
