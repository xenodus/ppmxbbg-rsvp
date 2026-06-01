import { useEffect, useMemo, useState } from "react";
import { fetchGuest, saveGuest } from "./api.js";
import { WEDDING } from "./constants.js";

function Divider() {
  return (
    <div className="divider" aria-hidden="true">
      <span className="divider-line" />
      <span className="divider-diamond">✦</span>
      <span className="divider-line" />
    </div>
  );
}

function getGuestId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id")?.trim() || "";
}

export default function App() {
  const guestId = useMemo(() => getGuestId(), []);
  const [name, setName] = useState("");
  const [attendance, setAttendance] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!guestId) {
      setLoading(false);
      setError("Guest not found. Please check your invitation link.");
      return;
    }

    let cancelled = false;

    async function loadGuest() {
      try {
        const guest = await fetchGuest(guestId);
        if (cancelled) return;

        setName(guest.name || "");
        if (guest.is_attending !== undefined && guest.is_attending !== null) {
          setAttendance(guest.is_attending);
        }
        if (guest.comment) {
          setComment(guest.comment);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message === "guest not found"
              ? "Guest not found. Please check your invitation link."
              : err.message,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGuest();
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (attendance === null) {
      setError("Please let us know if you will be attending.");
      return;
    }

    setSubmitting(true);
    try {
      await saveGuest({
        id: guestId,
        name: name.trim(),
        is_attending: attendance,
        comment: comment.trim() || null,
      });
      setSuccess("Thank you! Your RSVP has been saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const nameDisplay = loading
    ? "Loading guest details..."
    : name || "—";

  return (
    <div className="page">
      <header className="header">
        <p className="eyebrow">{WEDDING.inviteLine}</p>
        <h1 className="couple-names">{WEDDING.coupleNames}</h1>
        <p className="wedding-date">{WEDDING.date}</p>
      </header>

      <Divider />

      <main className="form-card">
        {error && <p className="banner banner-error">{error}</p>}
        {success && <p className="banner banner-success">{success}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="guest-name">
            FULL NAME
          </label>
          <div
            id="guest-name"
            className={`name-display ${loading ? "is-loading" : ""}`}
            aria-live="polite"
          >
            {nameDisplay}
          </div>

          <fieldset className="attendance-fieldset" disabled={loading || !!error}>
            <legend className="field-label">WILL YOU BE ATTENDING?</legend>
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

          <label className="field-label" htmlFor="dietary">
            DIETARY RESTRICTIONS
          </label>
          <textarea
            id="dietary"
            className="textarea"
            placeholder="Please let us know of any dietary needs, allergies, or preferences..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={loading || !!error}
            rows={5}
          />

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || submitting || !!error}
          >
            {submitting ? "SAVING..." : "SUBMIT RSVP"}
          </button>
        </form>
      </main>

      <Divider />

      <footer className="footer">
        <p>{WEDDING.venue}</p>
      </footer>
    </div>
  );
}
