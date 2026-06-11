import { useEffect } from "react";
import RsvpForm from "./RsvpForm.jsx";
import "./rsvp-popup.css";

export default function RsvpModal({ open, onClose, onInviteValidChange }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop rsvp-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-card rsvp-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsvp-modal-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close RSVP">
          ×
        </button>
        <RsvpForm
          className="form-card rsvp-modal-form"
          id="rsvp-modal"
          headingId="rsvp-modal-heading"
          onInviteValidChange={onInviteValidChange}
        />
      </div>
    </div>
  );
}
