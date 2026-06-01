import { useEffect, useMemo, useState } from "react";
import { declineAllGuests, fetchInvite, saveGuest, saveInvite } from "./api.js";
import GuestList from "./components/GuestList.jsx";
import GuestRespondModal from "./components/GuestRespondModal.jsx";
import { RSVP, WEDDING } from "./constants.js";

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

function inferAttendingChoice(invite) {
  const guestList = invite.guests || [];
  if (
    guestList.length > 0 &&
    guestList.every((guest) => guest.is_attending === false)
  ) {
    return "no";
  }

  const hasStarted =
    invite.require_parking != null ||
    invite.attend_solemnisation != null ||
    guestList.some((guest) => guest.is_attending != null);

  return hasStarted ? "yes" : null;
}

export default function App() {
  const inviteId = useMemo(() => getInviteId(), []);
  const [guests, setGuests] = useState([]);
  const [requireParking, setRequireParking] = useState(null);
  const [attendSolemnisation, setAttendSolemnisation] = useState(null);
  const [attendingChoice, setAttendingChoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingGuest, setSavingGuest] = useState(false);
  const [decliningAll, setDecliningAll] = useState(false);
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
        setAttendingChoice(inferAttendingChoice(invite));
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

  async function handleDeclineAll() {
    setError("");
    setSuccess("");
    setDecliningAll(true);

    try {
      const updated = await declineAllGuests({ id: inviteId, decline_all: true });
      setAttendingChoice("no");
      setGuests(updated.guests || []);
      setSuccess(RSVP.bigQuestion.declinedMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setDecliningAll(false);
    }
  }

  async function handleBigQuestionChoice(choice) {
    setError("");
    setSuccess("");

    if (choice === "no") {
      await handleDeclineAll();
      return;
    }

    setAttendingChoice("yes");
  }

  async function handleSaveInvite(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (attendSolemnisation === null) {
      setError("Please let us know about the solemnisation.");
      return;
    }
    if (requireParking === null) {
      setError("Please let us know about parking.");
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

  const formDisabled = loading || !!error || decliningAll;
  const showFullForm = attendingChoice === "yes";
  const bigQuestionValue =
    attendingChoice === "yes" ? true : attendingChoice === "no" ? false : null;

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
            <ChoiceSection
              number={RSVP.bigQuestion.number}
              title={RSVP.bigQuestion.title}
              question={RSVP.bigQuestion.question}
              value={bigQuestionValue}
              yesLabel={RSVP.bigQuestion.yes}
              noLabel={RSVP.bigQuestion.no}
              disabled={formDisabled}
              onSelectYes={() => handleBigQuestionChoice("yes")}
              onSelectNo={() => handleBigQuestionChoice("no")}
            />

            {showFullForm && (
              <>
                <form onSubmit={handleSaveInvite} noValidate>
                  <ChoiceSection
                    number={RSVP.solemnisation.number}
                    title={RSVP.solemnisation.title}
                    question={RSVP.solemnisation.question}
                    note={RSVP.solemnisation.note}
                    value={attendSolemnisation}
                    yesLabel={RSVP.solemnisation.yes}
                    noLabel={RSVP.solemnisation.no}
                    disabled={formDisabled}
                    onSelectYes={() => setAttendSolemnisation(true)}
                    onSelectNo={() => setAttendSolemnisation(false)}
                  />

                  <ChoiceSection
                    number={RSVP.parking.number}
                    title={RSVP.parking.title}
                    question={RSVP.parking.question}
                    value={requireParking}
                    yesLabel={RSVP.parking.yes}
                    noLabel={RSVP.parking.no}
                    disabled={formDisabled}
                    onSelectYes={() => setRequireParking(true)}
                    onSelectNo={() => setRequireParking(false)}
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
                  <h2 className="section-heading">4. Guests</h2>
                  <GuestList
                    guests={guests}
                    disabled={formDisabled}
                    onRespond={setActiveGuest}
                  />
                </section>
              </>
            )}
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
