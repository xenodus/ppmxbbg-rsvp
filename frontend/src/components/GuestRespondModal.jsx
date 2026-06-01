import { useState } from "react";
import { RSVP } from "../constants.js";

export default function GuestRespondModal({
  guest,
  submitting,
  onClose,
  onSave,
}) {
  const [attendance, setAttendance] = useState(guest.is_attending ?? null);
  const [dietaryRestriction, setDietaryRestriction] = useState(
    guest.dietary_restriction || "",
  );
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (attendance === null) {
      setError("Please let us know if this guest will be attending.");
      return;
    }

    try {
      await onSave({
        id: guest.id,
        is_attending: attendance,
        dietary_restriction: dietaryRestriction.trim(),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="respond-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="respond-title" className="modal-title">
          Guest Response
        </h2>

        <div className="modal-block">
          <label className="field-label" htmlFor="modal-guest-name">
            FULL NAME
          </label>
          <div id="modal-guest-name" className="name-display">
            {guest.name}
          </div>
        </div>

        {error && <p className="banner banner-error">{error}</p>}

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="modal-block">
            <span className="field-label" id="modal-attendance-label">
              WILL THEY BE ATTENDING?
            </span>
            <div
              className="attendance-options"
              role="group"
              aria-labelledby="modal-attendance-label"
            >
              <button
                type="button"
                className={`choice-btn ${attendance === true ? "is-selected" : ""}`}
                onClick={() => setAttendance(true)}
              >
                {RSVP.bigQuestion.yes}
              </button>
              <button
                type="button"
                className={`choice-btn ${attendance === false ? "is-selected" : ""}`}
                onClick={() => setAttendance(false)}
              >
                {RSVP.bigQuestion.no}
              </button>
            </div>
          </div>

          <div className="modal-block">
            <label className="field-label" htmlFor="modal-dietary">
              DIETARY RESTRICTIONS
            </label>
            <textarea
              id="modal-dietary"
              className="textarea"
              placeholder="Please let us know of any dietary needs, allergies, or preferences..."
              value={dietaryRestriction}
              onChange={(event) => setDietaryRestriction(event.target.value)}
              rows={4}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "SAVING..." : "SAVE RESPONSE"}
          </button>
        </form>
      </div>
    </div>
  );
}
