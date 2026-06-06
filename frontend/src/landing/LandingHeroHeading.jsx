const COUPLE_NAMES = "Vivian & Alvin";
const LINE_TWO = "are getting married!";

export default function LandingHeroHeading() {
  return (
    <div className="landing-hero-heading">
      <p className="landing-hero-heading__names">{COUPLE_NAMES}</p>
      <p className="landing-hero-heading__line-two">{LINE_TWO}</p>
    </div>
  );
}
