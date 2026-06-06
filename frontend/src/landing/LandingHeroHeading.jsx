import { useMemo } from "react";
import {
  useNamesFontSize,
  usePrefersReducedMotion,
  useTaglineFontSize,
  useVaraHandwriting,
} from "./useVaraHandwriting.js";

const COUPLE_NAMES = "Vivian & Alvin";
const LINE_TWO = "are getting married!";
const NAMES_WRITE_DURATION_MS = 2600;
const TAGLINE_WRITE_DURATION_MS = 2800;
const VARA_NAMES_FONT = "/fonts/vara/Parisienne.json";
const VARA_TAGLINE_FONT = "/fonts/vara/SatisfySL.json";

export default function LandingHeroHeading() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const namesFontSize = useNamesFontSize();
  const taglineFontSize = useTaglineFontSize();

  const namesVaraTexts = useMemo(
    () => [
      {
        text: COUPLE_NAMES,
        fontSize: namesFontSize,
        color: "#dd774a",
        textAlign: "center",
        duration: NAMES_WRITE_DURATION_MS,
        delay: 0,
        strokeWidth: 1.2,
      },
    ],
    [namesFontSize],
  );

  const taglineVaraTexts = useMemo(
    () => [
      {
        text: LINE_TWO,
        fontSize: taglineFontSize,
        color: "#dd774a",
        textAlign: "center",
        duration: TAGLINE_WRITE_DURATION_MS,
        delay: NAMES_WRITE_DURATION_MS,
        strokeWidth: 1,
      },
    ],
    [taglineFontSize],
  );

  const namesVaraOptions = useMemo(
    () => ({
      fontSize: namesFontSize,
      color: "#dd774a",
      textAlign: "center",
      strokeWidth: 1.2,
    }),
    [namesFontSize],
  );

  const taglineVaraOptions = useMemo(
    () => ({
      fontSize: taglineFontSize,
      color: "#dd774a",
      textAlign: "center",
      strokeWidth: 1,
    }),
    [taglineFontSize],
  );

  const namesVaraRef = useVaraHandwriting({
    enabled: !prefersReducedMotion,
    fontUrl: VARA_NAMES_FONT,
    texts: namesVaraTexts,
    options: namesVaraOptions,
  });

  const taglineVaraRef = useVaraHandwriting({
    enabled: !prefersReducedMotion,
    fontUrl: VARA_TAGLINE_FONT,
    texts: taglineVaraTexts,
    options: taglineVaraOptions,
  });

  if (prefersReducedMotion) {
    return (
      <div className="landing-hero-heading">
        <p className="landing-hero-heading__names" aria-label={COUPLE_NAMES}>
          {COUPLE_NAMES}
        </p>
        <p className="landing-hero-heading__line-two" aria-label="are getting married">
          {LINE_TWO}
        </p>
      </div>
    );
  }

  return (
    <div className="landing-hero-heading">
      <div
        ref={namesVaraRef}
        className="landing-hero-heading__names landing-hero-heading__names--vara"
        role="img"
        aria-label={COUPLE_NAMES}
      />
      <div
        ref={taglineVaraRef}
        className="landing-hero-heading__line-two landing-hero-heading__line-two--vara"
        role="img"
        aria-label="are getting married"
      />
    </div>
  );
}
