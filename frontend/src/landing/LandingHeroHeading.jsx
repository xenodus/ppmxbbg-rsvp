import { useTypedHero, usePrefersReducedMotion } from "./useTypedHero.js";

const COUPLE_NAMES = "Vivian & Alvin";
const LINE_TWO = "are getting married!";

export default function LandingHeroHeading() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { namesRef, taglineRef } = useTypedHero({
    names: COUPLE_NAMES,
    tagline: LINE_TWO,
    enabled: !prefersReducedMotion,
  });

  return (
    <div className="landing-hero-heading">
      <p className="landing-hero-heading__names" aria-label={COUPLE_NAMES}>
        {prefersReducedMotion ? (
          COUPLE_NAMES
        ) : (
          <>
            <span className="landing-hero-heading__reserve" aria-hidden="true">
              {COUPLE_NAMES}
            </span>
            <span ref={namesRef} className="landing-hero-heading__typed" aria-hidden="true" />
          </>
        )}
      </p>
      <p className="landing-hero-heading__line-two" aria-label="are getting married">
        {prefersReducedMotion ? (
          LINE_TWO
        ) : (
          <>
            <span className="landing-hero-heading__reserve" aria-hidden="true">
              {LINE_TWO}
            </span>
            <span ref={taglineRef} className="landing-hero-heading__typed" aria-hidden="true" />
          </>
        )}
      </p>
    </div>
  );
}
