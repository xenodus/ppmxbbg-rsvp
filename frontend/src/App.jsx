import { useEffect, useMemo, useState } from "react";
import { fetchInvite, saveGuest, saveInvite } from "./api.js";
import Countdown from "./components/Countdown.jsx";
import Faq from "./components/Faq.jsx";
import GettingThere from "./components/GettingThere.jsx";
import GuestList from "./components/GuestList.jsx";
import GuestRespondModal from "./components/GuestRespondModal.jsx";
import { RSVP, RSVP_CUTOFF, WEDDING } from "./constants.js";

const RSVP_CUTOFF_MS = new Date(RSVP_CUTOFF.dateTime).getTime();

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

function ChoiceSection({
  number,
  title,
  question,
  note,
  value,
  yesLabel,
  noLabel,
  disabled,
  onSelectYes,
  onSelectNo,
}) {
  return (
    <section className="form-section">
      <h2 className="section-heading">
        {number}. {title}
      </h2>
      <p className="section-question">{question}</p>
      {note && <p className="section-note">{note}</p>}
      <div className="attendance-options">
        <button
          type="button"
          className={`choice-btn ${value === true ? "is-selected" : ""}`}
          onClick={onSelectYes}
          disabled={disabled}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          className={`choice-btn ${value === false ? "is-selected" : ""}`}
          onClick={onSelectNo}
          disabled={disabled}
        >
          {noLabel}
        </button>
      </div>
    </section>
  );
}

function guestRsvpState(guestList) {
  const allResponded =
    guestList.length > 0 && guestList.every((guest) => guest.is_attending != null);
  const allDeclined =
    allResponded && guestList.every((guest) => guest.is_attending === false);
  const anyAttending = guestList.some((guest) => guest.is_attending === true);

  return { allResponded, allDeclined, anyAttending };
}

export default function App() {
  const inviteId = useMemo(() => getInviteId(), []);
  const [now, setNow] = useState(() => new Date());
  const [guests, setGuests] = useState([]);
  const [requireParking, setRequireParking] = useState(null);
  const [attendSolemnisation, setAttendSolemnisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingGuest, setSavingGuest] = useState(false);
  const [activeGuest, setActiveGuest] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const rsvpClosed = now.getTime() >= RSVP_CUTOFF_MS;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (rsvpClosed) {
      setLoading(false);
      setActiveGuest(null);
      setError("");
      setSuccess("");
      return;
    }

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
  }, [inviteId, rsvpClosed]);

  const formDisabled = loading || !!error || rsvpClosed;
  const hasSavedRsvp =
    requireParking != null ||
    attendSolemnisation != null ||
    guests.some((guest) => guest.is_attending != null);
  const { allResponded, allDeclined, anyAttending } = guestRsvpState(guests);
  const showStep2 = allResponded && anyAttending;
  const showStep3 = showStep2 && attendSolemnisation != null;
  const inviteChoicesDisabled = formDisabled || savingInvite;

  async function handleInviteChoice(field, value) {
    const previousAttend = attendSolemnisation;
    const previousParking = requireParking;

    if (field === "attend_solemnisation") {
      setAttendSolemnisation(value);
    } else {
      setRequireParking(value);
    }

    setError("");
    setSavingInvite(true);

    try {
      const updated = await saveInvite({
        id: inviteId,
        [field]: value,
      });
      setGuests(updated.guests || []);
      if (updated.require_parking !== undefined && updated.require_parking !== null) {
        setRequireParking(updated.require_parking);
      }
      if (
        updated.attend_solemnisation !== undefined &&
        updated.attend_solemnisation !== null
      ) {
        setAttendSolemnisation(updated.attend_solemnisation);
      }
    } catch (err) {
      setAttendSolemnisation(previousAttend);
      setRequireParking(previousParking);
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
      const updatedGuests = guests.map((guest) =>
        guest.id === payload.id
          ? {
              ...guest,
              is_attending: payload.is_attending,
              dietary_restriction: payload.dietary_restriction,
            }
          : guest,
      );
      setGuests(updatedGuests);
      setActiveGuest(null);

      const { allDeclined: everyoneDeclined } = guestRsvpState(updatedGuests);
      if (everyoneDeclined) {
        setSuccess(RSVP.bigQuestion.declinedMessage);
      } else {
        setSuccess("Guest response saved.");
      }
    } catch (err) {
      throw err;
    } finally {
      setSavingGuest(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <p className="eyebrow">{WEDDING.inviteLine}</p>
        <h1 className="couple-names">{WEDDING.coupleNames}</h1>
        <nav className="page-nav" aria-label="Page sections">
          <a href="#rsvp">RSVP</a>
          <a href="#getting-there">Getting There</a>
          <a href="#faq">FAQ</a>
        </nav>
        <p className="wedding-date">{WEDDING.date}</p>
        <Countdown />
      </header>

      <Divider />

      <main id="rsvp" className="form-card" aria-labelledby="rsvp-heading">
        <h2 id="rsvp-heading" className="card-title">
          RSVP
        </h2>
        {error && <p className="banner banner-error">{error}</p>}
        {success && <p className="banner banner-success">{success}</p>}

        {rsvpClosed ? (
          <p className="closed-message">{RSVP_CUTOFF.closedMessage}</p>
        ) : loading ? (
          <p className="loading-text">Loading invitation details...</p>
        ) : !error ? (
          <>
            <section className="form-section">
              <h2 className="section-heading">
                {RSVP.bigQuestion.number}. {RSVP.bigQuestion.title}
              </h2>
              <p className="section-question">{RSVP.bigQuestion.question}</p>
              <GuestList
                guests={guests}
                disabled={formDisabled || savingGuest}
                onRespond={setActiveGuest}
              />
            </section>

            {hasSavedRsvp && anyAttending && (
              <p className="section-note">You can update your responses at any time.</p>
            )}

            {allDeclined && (
              <p className="section-note">{RSVP.bigQuestion.declinedMessage}</p>
            )}

            {showStep2 && (
              <ChoiceSection
                number={RSVP.solemnisation.number}
                title={RSVP.solemnisation.title}
                question={RSVP.solemnisation.question}
                note={RSVP.solemnisation.note}
                value={attendSolemnisation}
                yesLabel={RSVP.solemnisation.yes}
                noLabel={RSVP.solemnisation.no}
                disabled={inviteChoicesDisabled}
                onSelectYes={() => handleInviteChoice("attend_solemnisation", true)}
                onSelectNo={() => handleInviteChoice("attend_solemnisation", false)}
              />
            )}

            {showStep3 && (
              <ChoiceSection
                number={RSVP.parking.number}
                title={RSVP.parking.title}
                question={RSVP.parking.question}
                value={requireParking}
                yesLabel={RSVP.parking.yes}
                noLabel={RSVP.parking.no}
                disabled={inviteChoicesDisabled}
                onSelectYes={() => handleInviteChoice("require_parking", true)}
                onSelectNo={() => handleInviteChoice("require_parking", false)}
              />
            )}

          </>
        ) : null}
      </main>

      <Divider />

      <GettingThere />

      <Divider />

      <Faq />

      {activeGuest && !rsvpClosed && (
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
