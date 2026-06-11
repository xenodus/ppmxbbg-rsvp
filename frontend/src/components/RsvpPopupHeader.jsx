import { rsvpPopupIcon } from "../landing/images.js";
import "./rsvp-popup.css";

export default function RsvpPopupHeader({ onBack, backLabel = "Back" }) {
  return (
    <div className="rsvp-popup-header">
      <button type="button" className="rsvp-popup-back" onClick={onBack}>
        {backLabel}
      </button>
      <img src={rsvpPopupIcon} alt="" className="rsvp-popup-icon" aria-hidden="true" />
    </div>
  );
}
