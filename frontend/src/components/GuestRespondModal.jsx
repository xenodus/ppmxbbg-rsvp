import { useState } from "react";
import { RSVP } from "../constants.js";
import RsvpPopupHeader from "./RsvpPopupHeader.jsx";

export default function GuestRespondModal({
  guest,
  submitting,
  onClose,
  onSave,
}) {
  const [attendance, setAttendance] = useState(guest.is_attending ?? null);
  const [attendSolemnisation, setAttendSolemnisation] = useState(
    guest.attend_solemnisation ?? null,
  );
  const [dietaryRestriction, setDietaryRestriction] = useState(
    guest.dietary_restriction || "",
  );
  const [error, setError] = useState("");

  function handleAttendance(value) {
    setAttendance(value);
    if (value === false) {
      setAttendSolemnisation(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (attendance === null) {
      setError("Please let us know if this guest will be attending.");
      return;
    }

    if (attendance === true && attendSolemnisation === null) {
      setError("Please let us know about the solemnisation.");
      return;
    }

    try {
      const payload = {
        id: guest.id,
        is_attending: attendance,
        dietary_restriction: dietaryRestriction.trim(),
      };
      if (attendance === true) {
        payload.attend_solemnisation = attendSolemnisation;
      }
      await onSave(payload);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className="modal-backdrop rsvp-popup-backdrop guest-respond-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-card rsvp-popup-card guest-respond-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="respond-title"
        onClick={(event) => event.stopPropagation()}
      >
        <RsvpPopupHeader onBack={onClose} />

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
                onClick={() => handleAttendance(true)}
              >
                {RSVP.bigQuestion.yes}
              </button>
              <button
                type="button"
                className={`choice-btn ${attendance === false ? "is-selected" : ""}`}
                onClick={() => handleAttendance(false)}
              >
                {RSVP.bigQuestion.no}
              </button>
            </div>
          </div>

          {attendance === true && (
            <div className="modal-block">
              <span className="field-label" id="modal-solemnisation-label">
                THE SOLEMNISATION
              </span>
              <p className="section-question">{RSVP.solemnisation.question}</p>
              {RSVP.solemnisation.note && (
                <p className="section-note">{RSVP.solemnisation.note}</p>
              )}
              <div
                className="attendance-options"
                role="group"
                aria-labelledby="modal-solemnisation-label"
              >
                <button
                  type="button"
                  className={`choice-btn ${attendSolemnisation === true ? "is-selected" : ""}`}
                  onClick={() => setAttendSolemnisation(true)}
                >
                  {RSVP.solemnisation.yes}
                </button>
                <button
                  type="button"
                  className={`choice-btn ${attendSolemnisation === false ? "is-selected" : ""}`}
                  onClick={() => setAttendSolemnisation(false)}
                >
                  {RSVP.solemnisation.no}
                </button>
              </div>
            </div>
          )}

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
