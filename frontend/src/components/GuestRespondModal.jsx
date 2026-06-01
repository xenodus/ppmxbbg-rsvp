import { useState } from "react";

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
        dietary_restriction: dietaryRestriction.trim() || null,
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

        <label className="field-label" htmlFor="modal-guest-name">
          FULL NAME
        </label>
        <div id="modal-guest-name" className="name-display">
          {guest.name}
        </div>

        {error && <p className="banner banner-error">{error}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="attendance-fieldset">
            <legend className="field-label">WILL THEY BE ATTENDING?</legend>
            <div className="attendance-options">
              <button
                type="button"
                className={`attendance-btn ${attendance === true ? "is-selected" : ""}`}
                onClick={() => setAttendance(true)}
              >
                ✦ JOYFULLY ACCEPTS
              </button>
              <button
                type="button"
                className={`attendance-btn ${attendance === false ? "is-selected" : ""}`}
                onClick={() => setAttendance(false)}
              >
                REGRETFULLY DECLINES
              </button>
            </div>
          </fieldset>

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

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "SAVING..." : "SAVE RESPONSE"}
          </button>
        </form>
      </div>
    </div>
  );
}
