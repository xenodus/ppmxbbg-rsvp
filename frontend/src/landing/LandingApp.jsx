import { useState } from "react";
import Faq from "../components/Faq.jsx";
import GettingThere from "../components/GettingThere.jsx";
import LandingHeroHeading from "./LandingHeroHeading.jsx";
import RsvpModal from "../components/RsvpModal.jsx";
import SiteNav from "../components/SiteNav.jsx";
import { WEDDING } from "../constants.js";
import {
  faqImg,
  gettingThereImg,
  joinUsImg,
  lotsOfLoveImg,
  rsvpImg,
  spriteImg,
  weddingDayImg,
  whereBgImg,
  whereForegroundImg,
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
          <LandingHeroHeading />
          <div
            className="landing-sprite"
            style={{ backgroundImage: `url(${spriteImg})` }}
            role="img"
            aria-label="Animated wedding invitation illustration"
          />
        </section>

        <section
          id="join-us"
          className="landing-section landing-section--join-us"
          aria-label="Join us"
        >
          <img
            src={joinUsImg}
            alt="Join us for our wedding celebration"
            width="1080"
            height="677"
            loading="eager"
            decoding="async"
          />
        </section>

        <section
          id="where"
          className="landing-section landing-section--where"
          aria-label="Where"
        >
          <div className="landing-where">
            <div className="landing-where__bg" aria-hidden="true">
              <img
                src={whereBgImg}
                alt=""
                width="1080"
                height="661"
                loading="lazy"
                decoding="async"
              />
              <div className="landing-where__overlay" />
            </div>
            <img
              className="landing-where__foreground"
              src={whereForegroundImg}
              alt="Wedding venue and location details"
              width="1080"
              height="661"
              loading="lazy"
              decoding="async"
            />
          </div>
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
              width="1080"
              height="960"
              loading="lazy"
              decoding="async"
            />
          </button>
        </section>

        <section
          id="what"
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
          id="lots-of-love"
          className="landing-section landing-section--lots-of-love"
          aria-label="Lots of love"
        >
          <img
            src={lotsOfLoveImg}
            alt="Lots of love, Alvin and Vivian"
            width="1080"
            height="1400"
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

      <footer className="landing-footer">
        <p>© alvinandvivian.rsvp 2026</p>
      </footer>

      <RsvpModal open={rsvpOpen} onClose={() => setRsvpOpen(false)} />
    </>
  );
}
