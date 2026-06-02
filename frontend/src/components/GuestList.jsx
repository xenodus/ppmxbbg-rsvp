function guestStatus(isAttending, attendSolemnisation) {
  if (isAttending === true) {
    if (attendSolemnisation === true) {
      return { label: "Attending · Ceremony", className: "status-attending" };
    }
    if (attendSolemnisation === false) {
      return { label: "Attending · Lunch only", className: "status-attending" };
    }
    return { label: "Attending", className: "status-attending" };
  }
  if (isAttending === false) return { label: "Declined", className: "status-declined" };
  return { label: "Awaiting response", className: "status-pending" };
}

export default function GuestList({ guests, disabled, onRespond }) {
  if (guests.length === 0) {
    return <p className="empty-guests">No guests found for this invitation.</p>;
  }

  return (
    <ul className="guest-list">
      {guests.map((guest) => {
        const status = guestStatus(guest.is_attending, guest.attend_solemnisation);
        return (
          <li key={guest.id} className="guest-row">
            <div className="guest-row-main">
              <span className="guest-name">{guest.name}</span>
              <span className={`guest-status ${status.className}`}>{status.label}</span>
            </div>
            <button
              type="button"
              className="respond-btn"
              onClick={() => onRespond(guest)}
              disabled={disabled}
            >
              Respond
            </button>
          </li>
        );
      })}
    </ul>
  );
}
