import { WEDDING } from "../constants.js";

const LINE_TWO = "are getting married!";

export default function LandingHeroHeading() {
  return (
    <div className="landing-hero-heading">
      <p className="landing-hero-heading__names">{WEDDING.coupleNames}</p>
      <p className="landing-hero-heading__line-two">{LINE_TWO}</p>
    </div>
  );
}
