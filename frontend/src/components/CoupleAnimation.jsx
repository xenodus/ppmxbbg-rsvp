import { useEffect, useState } from "react";

const FRAME_COUNT = 9;
const FRAME_INTERVAL_MS = 180;

const frames = Array.from(
  { length: FRAME_COUNT },
  (_, index) => `/couple-animation/frame_${index + 1}.png`,
);

export default function CoupleAnimation() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionEnabled(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!motionEnabled) {
      return undefined;
    }

    const id = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % FRAME_COUNT);
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [motionEnabled]);

  return (
    <section
      className="couple-animation"
      aria-label="Alvin and Vivian illustration"
    >
      <img
        className="couple-animation-frame"
        src={frames[frameIndex]}
        alt=""
        width={640}
        height={360}
        decoding="async"
        draggable={false}
      />
    </section>
  );
}
