import { useState } from "react";
import Faq from "../components/Faq.jsx";
import GettingThere from "../components/GettingThere.jsx";
import RsvpModal from "../components/RsvpModal.jsx";
import SiteNav from "../components/SiteNav.jsx";
import { WEDDING } from "../constants.js";
import {
  faqImg,
  gettingThereImg,
  joinUsImg,
  rsvpImg,
  spriteImg,
  weddingDayImg,
  whereImg,
} from "./images.js";

export default function LandingApp() {
  const [rsvpOpen, setRsvpOpen] = useState(false);

  function openRsvp() {
    setRsvpOpen(true);
  }

  return (
    <>
      <SiteNav coupleNames={WEDDING.coupleNames} onRsvpOpen={openRsvp} />

      <main className="landing">
        <section className="landing-section landing-section--hero" aria-label="Welcome animation">
          <div className="landing-hero-heading">
            <svg
              className="landing-hero-heading__arch"
              viewBox="0 0 600 130"
              aria-labelledby="landing-hero-names-title"
              role="img"
            >
              <title id="landing-hero-names-title">Vivian &amp; Alvin</title>
              <defs>
                <path
                  id="landing-hero-arch-path"
                  d="M 24 108 Q 300 -8 576 108"
                  fill="none"
                />
              </defs>
              <text className="landing-hero-heading__arch-text">
                <textPath href="#landing-hero-arch-path" startOffset="50%" textAnchor="middle">
                  Vivian <tspan className="landing-hero-heading__amp">&amp;</tspan> Alvin
                </textPath>
              </text>
            </svg>
            <p className="landing-hero-heading__line-two">are getting married!</p>
          </div>
          <div
            className="landing-sprite"
            style={{ backgroundImage: `url(${spriteImg})` }}
            role="img"
            aria-label="Animated wedding invitation illustration"
          />
        </section>

        <section className="landing-section landing-section--join-us" aria-label="Join us">
          <img
            src={joinUsImg}
            alt="Join us for our wedding celebration"
            width="1080"
            height="677"
            loading="eager"
            decoding="async"
          />
        </section>

        <section className="landing-section landing-section--where" aria-label="Where">
          <img
            src={whereImg}
            alt="Wedding venue and location details"
            width="1080"
            height="661"
            loading="lazy"
            decoding="async"
          />
        </section>

        <section
          id="rsvp"
          className="landing-section landing-section--rsvp"
          aria-label="RSVP"
        >
          <button
            type="button"
            className="landing-rsvp-cta"
            onClick={openRsvp}
            aria-haspopup="dialog"
          >
            <img
              src={rsvpImg}
              alt="Please RSVP for our wedding"
              width="1079"
              height="959"
              loading="lazy"
              decoding="async"
            />
          </button>
        </section>

        <section
          className="landing-section landing-section--wedding-day"
          aria-label="Wedding day"
        >
          <img
            src={weddingDayImg}
            alt="Wedding day schedule and details"
            width="1080"
            height="1800"
            loading="lazy"
            decoding="async"
          />
        </section>

        <section
          id="getting-there"
          className="landing-section landing-section--getting-there"
          aria-label="Getting there"
        >
          <img
            src={gettingThereImg}
            alt="Getting to the wedding venue"
            width="1080"
            height="450"
            loading="lazy"
            decoding="async"
          />
          <GettingThere embedded />
        </section>

        <section id="faq" className="landing-section landing-section--faq" aria-label="FAQ">
          <img
            src={faqImg}
            alt="Wedding day frequently asked questions"
            width="1080"
            height="410"
            loading="lazy"
            decoding="async"
          />
          <Faq embedded />
        </section>
      </main>

      <RsvpModal open={rsvpOpen} onClose={() => setRsvpOpen(false)} />
    </>
  );
}
