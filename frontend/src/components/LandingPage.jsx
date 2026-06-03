import { LANDING } from "../landingContent.js";
import "../landing.css";

export default function LandingPage() {
  const { hero, date, venue, rsvp } = LANDING;

  return (
    <div className="landing">
      <section className="landing-section landing-hero" aria-labelledby="landing-hero-heading">
        <div className="landing-section-frame">
          <h1 id="landing-hero-heading" className="landing-hero-title">
            <span className="landing-hero-line">{hero.line1}</span>
            <span className="landing-hero-line landing-hero-line--sub">{hero.line2}</span>
          </h1>
          <div
            className="landing-couple-animation"
            role="img"
            aria-label={hero.animationLabel}
          />
        </div>
      </section>

      <section className="landing-section landing-date" aria-label="Wedding date">
        <div className="landing-section-frame">
          <img
            className="landing-date-art"
            src="/RSVP_Date.png"
            alt={date.imageAlt}
            width={1080}
            height={677}
            loading="lazy"
          />
        </div>
      </section>

      <section className="landing-section landing-venue" aria-labelledby="landing-venue-heading">
        <div className="landing-section-frame">
          <img
            className="landing-section-bg"
            src="/RSVP_Venue.png"
            alt=""
            width={1080}
            height={661}
            loading="lazy"
          />
          <div className="landing-section-overlay landing-venue-overlay">
            <h2 id="landing-venue-heading" className="landing-venue-heading">
              {venue.heading}
            </h2>
            <p className="landing-venue-line">{venue.line1}</p>
            <p className="landing-venue-line">{venue.line2}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-rsvp" aria-labelledby="landing-rsvp-heading">
        <div className="landing-section-frame">
          <img
            className="landing-section-bg"
            src="/RSVP.png"
            alt=""
            width={1080}
            height={960}
            loading="lazy"
          />
          <div className="landing-section-overlay landing-rsvp-overlay">
            <p id="landing-rsvp-heading" className="landing-rsvp-lead">
              {rsvp.lead}
            </p>
            <p className="landing-rsvp-deadline">{rsvp.deadline}</p>
          </div>
          <button type="button" className="landing-rsvp-cta">
            <span className="landing-rsvp-cta-line">{rsvp.ctaLine1}</span>
            <span className="landing-rsvp-cta-line">{rsvp.ctaLine2}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
