import { WEDDING } from "../constants.js";

export default function RsvpPopupWeddingHeader({ headingId }) {
  return (
    <header className="rsvp-popup-header">
      <h2 id={headingId} className="nav-drawer-title rsvp-popup-couple-names">
        {WEDDING.coupleNames}
      </h2>
      <p className="rsvp-popup-date">{WEDDING.popupDate}</p>
    </header>
  );
}
