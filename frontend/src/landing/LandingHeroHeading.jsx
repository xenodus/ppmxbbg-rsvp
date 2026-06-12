import { Fragment } from "react";
import { WEDDING } from "../constants.js";

const LINE_TWO = "are getting married!";
const NAME_PARTS = [
  { text: "Alvin", delayS: 0 },
  { text: "&", delayS: 0.14 },
  { text: "Vivian", delayS: 0.28 },
];

export default function LandingHeroHeading() {
  return (
    <div className="landing-hero-heading">
      <p className="landing-hero-heading__names" aria-label={WEDDING.coupleNames}>
        {NAME_PARTS.map((part, index) => (
          <Fragment key={part.text}>
            {index > 0 ? " " : null}
            <span
              className="landing-hero-heading__name-pop"
              style={{ animationDelay: `${part.delayS}s` }}
              aria-hidden="true"
            >
              {part.text}
            </span>
          </Fragment>
        ))}
      </p>
      <p className="landing-hero-heading__line-two">{LINE_TWO}</p>
    </div>
  );
}
