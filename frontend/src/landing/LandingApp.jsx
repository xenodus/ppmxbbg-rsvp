import { useState } from "react";
import RsvpModal from "../components/RsvpModal.jsx";
import SiteNav from "../components/SiteNav.jsx";
import { WEDDING } from "../constants.js";

export default function LandingApp() {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [inviteValid, setInviteValid] = useState(false);

  function openRsvp() {
    setRsvpOpen(true);
  }

  return (
    <>
      <SiteNav
        coupleNames={WEDDING.coupleNames}
        inviteValid={inviteValid}
        onRsvpOpen={openRsvp}
      />

      <main className="landing">
        <section className="landing-section landing-section--hero" aria-label="Welcome animation">
          <div
            className="landing-sprite"
            role="img"
            aria-label="Animated wedding invitation illustration"
          />
        </section>

        <section className="landing-section landing-section--join-us" aria-label="Join us">
          <img
            src="/images/join-us.webp"
            alt="Join us for our wedding celebration"
            width="1080"
            height="677"
            loading="eager"
            decoding="async"
          />
        </section>

        <section className="landing-section landing-section--where" aria-label="Where">
          <img
            src="/images/where.webp"
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
              src="/images/rsvp.webp"
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
            src="/images/wedding-day.webp"
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
            src="/images/getting-there.webp"
            alt="Getting to the wedding venue"
            width="1080"
            height="450"
            loading="lazy"
            decoding="async"
          />
        </section>

        <section id="faq" className="landing-section landing-section--faq" aria-label="FAQ">
          <img
            src="/images/faq.webp"
            alt="Wedding day frequently asked questions"
            width="1080"
            height="410"
            loading="lazy"
            decoding="async"
          />
        </section>
      </main>

      <RsvpModal
        open={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        onInviteValidChange={setInviteValid}
      />
    </>
  );
}
