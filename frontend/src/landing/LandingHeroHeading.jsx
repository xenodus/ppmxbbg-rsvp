import { useLayoutEffect, useRef, useState } from "react";

const ARCH_PATH = "M 24 110 Q 300 -28 576 110";
const ARCH_MASK_ID = "landing-hero-arch-mask";
const LINE_TWO = "are getting married!";
const ARCH_WRITE_DURATION_S = 4.5;
const CHAR_DRAW_DURATION_S = 0.65;
const CHAR_STAGGER_S = 0.16;

export default function LandingHeroHeading() {
  const maskPathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);

  useLayoutEffect(() => {
    const length = maskPathRef.current?.getTotalLength() ?? 0;
    setPathLength(length);
  }, []);

  return (
    <div
      className={`landing-hero-heading${pathLength ? " landing-hero-heading--ready" : ""}`}
      style={{ "--hero-arch-duration": `${ARCH_WRITE_DURATION_S}s` }}
    >
      <svg
        className="landing-hero-heading__arch"
        viewBox="0 -25 600 150"
        aria-labelledby="landing-hero-names-title"
        role="img"
      >
        <title id="landing-hero-names-title">Vivian &amp; Alvin</title>
        <defs>
          <path id="landing-hero-arch-path" d={ARCH_PATH} fill="none" />
          <mask id={ARCH_MASK_ID}>
            <path
              ref={maskPathRef}
              className="landing-hero-heading__arch-mask-path"
              d={ARCH_PATH}
              fill="none"
              stroke="white"
              strokeWidth="130"
              strokeLinecap="round"
              style={
                pathLength
                  ? { "--arch-path-length": `${pathLength}px` }
                  : undefined
              }
            />
          </mask>
        </defs>
        <text
          className="landing-hero-heading__arch-text"
          mask={`url(#${ARCH_MASK_ID})`}
        >
          <textPath href="#landing-hero-arch-path" startOffset="50%" textAnchor="middle">
            Vivian <tspan className="landing-hero-heading__amp">&amp;</tspan> Alvin
          </textPath>
        </text>
      </svg>

      <p className="landing-hero-heading__line-two" aria-label="are getting married">
        {LINE_TWO.split("").map((char, index) => (
          <span key={`${index}-${char}`} className="landing-hero-heading__char-wrap">
            <span
              className="landing-hero-heading__char-draw"
              style={{
                animationDelay: `${ARCH_WRITE_DURATION_S + index * CHAR_STAGGER_S}s`,
                animationDuration: `${CHAR_DRAW_DURATION_S}s`,
              }}
              aria-hidden="true"
            >
              {char === " " ? "\u00a0" : char}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}
