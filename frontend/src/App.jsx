import { useEffect, useMemo, useState } from "react";
import { fetchInvite, saveGuest, saveInvite } from "./api.js";
import GuestList from "./components/GuestList.jsx";
import GuestRespondModal from "./components/GuestRespondModal.jsx";
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

function getInviteId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id")?.trim() || "";
}

function YesNoField({ label, value, disabled, onChange }) {
  return (
    <fieldset className="attendance-fieldset" disabled={disabled}>
      <legend className="field-label">{label}</legend>
      <div className="attendance-options">
        <button
          type="button"
          className={`attendance-btn ${value === true ? "is-selected" : ""}`}
          onClick={() => onChange(true)}
        >
          YES
        </button>
        <button
          type="button"
          className={`attendance-btn ${value === false ? "is-selected" : ""}`}
          onClick={() => onChange(false)}
        >
          NO
        </button>
      </div>
    </fieldset>
  );
}

export default function App() {
  const inviteId = useMemo(() => getInviteId(), []);
  const [guests, setGuests] = useState([]);
  const [requireParking, setRequireParking] = useState(null);
  const [attendSolemnisation, setAttendSolemnisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingGuest, setSavingGuest] = useState(false);
  const [activeGuest, setActiveGuest] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!inviteId) {
      setLoading(false);
      setError("Invite not found. Please check your invitation link.");
      return;
    }

    let cancelled = false;

    async function loadInvite() {
      try {
        const invite = await fetchInvite(inviteId);
        if (cancelled) return;

        setGuests(invite.guests || []);
        if (invite.require_parking !== undefined && invite.require_parking !== null) {
          setRequireParking(invite.require_parking);
        }
        if (
          invite.attend_solemnisation !== undefined &&
          invite.attend_solemnisation !== null
        ) {
          setAttendSolemnisation(invite.attend_solemnisation);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message === "invite not found"
              ? "Invite not found. Please check your invitation link."
              : err.message,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteId]);

  async function handleSaveInvite(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (requireParking === null) {
      setError("Please let us know if couple parking is required.");
      return;
    }
    if (attendSolemnisation === null) {
      setError("Please let us know if you will be attending the solemnisation.");
      return;
    }

    setSavingInvite(true);
    try {
      const updated = await saveInvite({
        id: inviteId,
        require_parking: requireParking,
        attend_solemnisation: attendSolemnisation,
      });
      setGuests(updated.guests || []);
      setRequireParking(updated.require_parking ?? requireParking);
      setAttendSolemnisation(updated.attend_solemnisation ?? attendSolemnisation);
      setSuccess("Invitation details saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingInvite(false);
    }
  }

  async function handleSaveGuest(payload) {
    setSavingGuest(true);
    setError("");
    setSuccess("");

    try {
      await saveGuest(payload);
      setGuests((current) =>
        current.map((guest) =>
          guest.id === payload.id
            ? {
                ...guest,
                is_attending: payload.is_attending,
                dietary_restriction: payload.dietary_restriction,
              }
            : guest,
        ),
      );
      setActiveGuest(null);
      setSuccess("Guest response saved.");
    } catch (err) {
      throw err;
    } finally {
      setSavingGuest(false);
    }
  }

  const formDisabled = loading || !!error;

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

        {loading ? (
          <p className="loading-text">Loading invitation details...</p>
        ) : !error ? (
          <>
            <form onSubmit={handleSaveInvite} noValidate>
              <YesNoField
                label="IS COUPLE PARKING REQUIRED?"
                value={requireParking}
                disabled={formDisabled}
                onChange={setRequireParking}
              />

              <YesNoField
                label="WILL YOU BE ATTENDING THE SOLEMNISATION?"
                value={attendSolemnisation}
                disabled={formDisabled}
                onChange={setAttendSolemnisation}
              />

              <button
                type="submit"
                className="submit-btn"
                disabled={formDisabled || savingInvite}
              >
                {savingInvite ? "SAVING..." : "SAVE INVITATION DETAILS"}
              </button>
            </form>

            <section className="guest-section">
              <h2 className="section-title">Guests</h2>
              <GuestList
                guests={guests}
                disabled={formDisabled}
                onRespond={setActiveGuest}
              />
            </section>
          </>
        ) : null}
      </main>

      {activeGuest && (
        <GuestRespondModal
          guest={activeGuest}
          submitting={savingGuest}
          onClose={() => setActiveGuest(null)}
          onSave={handleSaveGuest}
        />
      )}

      <Divider />

      <footer className="footer">
        <p>{WEDDING.venue}</p>
      </footer>
    </div>
  );
}
