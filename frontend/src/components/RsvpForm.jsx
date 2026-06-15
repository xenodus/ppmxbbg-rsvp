import { useEffect, useMemo, useState } from "react";
import { fetchInvite, saveGuest, saveInvite } from "../api.js";
import FadeAwayMessage from "./FadeAwayMessage.jsx";
import GuestList from "./GuestList.jsx";
import GuestRespondModal from "./GuestRespondModal.jsx";
import { RSVP, RSVP_CUTOFF } from "../constants.js";

const RSVP_CUTOFF_MS = new Date(RSVP_CUTOFF.dateTime).getTime();
const RESPONSE_SAVED_MESSAGE = "Response saved.";

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
  submitting,
  submitDisabled,
  savedMessage,
  onSelectYes,
  onSelectNo,
  onSubmit,
}) {
  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit();
  }

  return (
    <section className="form-section">
      <h2 className="section-heading">
        {number}. {title}
      </h2>
      <p className="section-question">{question}</p>
      {note && <p className="section-note">{note}</p>}
      <form className="choice-section-form" onSubmit={handleSubmit} noValidate>
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
        <button
          type="submit"
          className="submit-btn"
          disabled={disabled || submitDisabled || submitting}
        >
          {submitting ? "SAVING..." : "SAVE RESPONSE"}
        </button>
      </form>
      <FadeAwayMessage message={savedMessage} />
    </section>
  );
}

function guestRsvpState(guestList) {
  const allResponded =
    guestList.length > 0 && guestList.every((guest) => guest.is_attending != null);
  const allDeclined =
    allResponded && guestList.every((guest) => guest.is_attending === false);
  const anyAttending = guestList.some((guest) => guest.is_attending === true);
  const attendingGuests = guestList.filter((guest) => guest.is_attending === true);
  const allAttendingAnsweredSolemnisation =
    attendingGuests.length > 0 &&
    attendingGuests.every((guest) => guest.attend_solemnisation != null);

  return { allResponded, allDeclined, anyAttending, allAttendingAnsweredSolemnisation };
}

function guestResponseUnchanged(guest, payload) {
  if (!guest || guest.is_attending !== payload.is_attending) {
    return false;
  }

  if (payload.is_attending === true) {
    if (guest.attend_solemnisation !== payload.attend_solemnisation) {
      return false;
    }

    const savedDietary = (guest.dietary_restriction || "").trim();
    const nextDietary = (payload.dietary_restriction || "").trim();
    if (savedDietary !== nextDietary) {
      return false;
    }
  }

  return true;
}

function guestSaveSuccessMessage(guestList) {
  const { allDeclined: everyoneDeclined } = guestRsvpState(guestList);
  if (everyoneDeclined) {
    return RSVP.bigQuestion.declinedMessage;
  }
  return RESPONSE_SAVED_MESSAGE;
}

export default function RsvpForm({
  className = "form-card",
  id = "rsvp",
  headingId = "rsvp-heading",
  showTitle = true,
  onInviteValidChange,
}) {
  const inviteId = useMemo(() => getInviteId(), []);
  const [now, setNow] = useState(() => new Date());
  const [guests, setGuests] = useState([]);
  const [requireParking, setRequireParking] = useState(null);
  const [pendingParking, setPendingParking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingGuest, setSavingGuest] = useState(false);
  const [activeGuest, setActiveGuest] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [parkingSavedMessage, setParkingSavedMessage] = useState("");
  const [inviteValid, setInviteValid] = useState(false);
  const rsvpClosed = now.getTime() >= RSVP_CUTOFF_MS;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    onInviteValidChange?.(inviteValid);
  }, [inviteValid, onInviteValidChange]);

  useEffect(() => {
    if (!inviteId) {
      setLoading(false);
      setInviteValid(false);
      setActiveGuest(null);
      setSuccess("");
      if (!rsvpClosed) {
        setError("Invite not found. Please check your invitation link.");
      } else {
        setError("");
      }
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadInvite() {
      try {
        const invite = await fetchInvite(inviteId);
        if (cancelled) return;

        setInviteValid(true);
        if (!rsvpClosed) {
          setGuests(invite.guests || []);
          if (invite.require_parking !== undefined && invite.require_parking !== null) {
            setRequireParking(invite.require_parking);
            setPendingParking(invite.require_parking);
          } else {
            setPendingParking(null);
          }
          setError("");
        }
      } catch (err) {
        if (cancelled) return;
        setInviteValid(false);
        if (!rsvpClosed) {
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

    if (rsvpClosed) {
      setActiveGuest(null);
      setSuccess("");
      setError("");
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteId, rsvpClosed]);

  const formDisabled = loading || !!error || rsvpClosed;
  const { allDeclined, anyAttending, allAttendingAnsweredSolemnisation } =
    guestRsvpState(guests);
  const showParking = anyAttending && allAttendingAnsweredSolemnisation;
  const inviteChoicesDisabled = formDisabled || savingInvite;

  function showParkingSavedMessage() {
    setParkingSavedMessage(RESPONSE_SAVED_MESSAGE);
  }

  function showSuccessMessage(message) {
    setSuccess(message);
  }

  function handleParkingSelect(value) {
    setPendingParking(value);
    setError("");
    setParkingSavedMessage("");
  }

  async function handleParkingSubmit() {
    if (pendingParking === null) {
      return;
    }

    if (pendingParking === requireParking) {
      setError("");
      showParkingSavedMessage();
      return;
    }

    const previousParking = requireParking;
    const previousPending = pendingParking;
    setRequireParking(pendingParking);
    setError("");
    setParkingSavedMessage("");
    setSavingInvite(true);

    try {
      const updated = await saveInvite({
        id: inviteId,
        require_parking: pendingParking,
      });
      setGuests(updated.guests || []);
      if (updated.require_parking !== undefined && updated.require_parking !== null) {
        setRequireParking(updated.require_parking);
        setPendingParking(updated.require_parking);
      }
      showParkingSavedMessage();
    } catch (err) {
      setRequireParking(previousParking);
      setPendingParking(previousPending);
      setParkingSavedMessage("");
      setError(err.message);
    } finally {
      setSavingInvite(false);
    }
  }

  async function handleSaveGuest(payload) {
    setError("");
    setSuccess("");

    const existing = guests.find((guest) => guest.id === payload.id);
    if (guestResponseUnchanged(existing, payload)) {
      setActiveGuest(null);
      showSuccessMessage(guestSaveSuccessMessage(guests));
      return;
    }

    setSavingGuest(true);

    try {
      await saveGuest(payload);
      const updatedGuests = guests.map((guest) =>
        guest.id === payload.id
          ? {
              ...guest,
              is_attending: payload.is_attending,
              dietary_restriction:
                payload.is_attending === true ? payload.dietary_restriction : "",
              attend_solemnisation:
                payload.is_attending === true ? payload.attend_solemnisation : null,
            }
          : guest,
      );
      setGuests(updatedGuests);
      setActiveGuest(null);
      showSuccessMessage(guestSaveSuccessMessage(updatedGuests));
    } catch (err) {
      throw err;
    } finally {
      setSavingGuest(false);
    }
  }

  return (
    <>
      <div id={id} className={className} aria-labelledby={headingId}>
        {showTitle && (
          <h2 id={headingId} className="card-title">
            RSVP
          </h2>
        )}
        {error && <p className="banner banner-error">{error}</p>}

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
              <FadeAwayMessage message={success} />
            </section>

            {allDeclined && (
              <p className="section-note">{RSVP.bigQuestion.declinedMessage}</p>
            )}

            {showParking && (
              <ChoiceSection
                number={RSVP.parking.number}
                title={RSVP.parking.title}
                question={RSVP.parking.question}
                value={pendingParking}
                yesLabel={RSVP.parking.yes}
                noLabel={RSVP.parking.no}
                disabled={inviteChoicesDisabled}
                submitting={savingInvite}
                submitDisabled={pendingParking === null}
                savedMessage={parkingSavedMessage}
                onSelectYes={() => handleParkingSelect(true)}
                onSelectNo={() => handleParkingSelect(false)}
                onSubmit={handleParkingSubmit}
              />
            )}
          </>
        ) : null}
      </div>

      {activeGuest && !rsvpClosed && (
        <GuestRespondModal
          guest={activeGuest}
          submitting={savingGuest}
          onClose={() => setActiveGuest(null)}
          onSave={handleSaveGuest}
        />
      )}
    </>
  );
}
