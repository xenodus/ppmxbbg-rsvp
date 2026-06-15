export function guestResponded(guest) {
  return guest.is_attending !== undefined && guest.is_attending !== null;
}

export function guestIsAttending(guest) {
  return guest.is_attending === true;
}

export function guestIsRejected(guest) {
  return guestResponded(guest) && guest.is_attending === false;
}

export function inviteIsSent(invite) {
  return invite.is_sent === true;
}

export function inviteHasAttendingGuest(invite) {
  return (invite.guests || []).some(guestIsAttending);
}

export function inviteHasRejectedGuest(invite) {
  return (invite.guests || []).some(guestIsRejected);
}

export function computeInviteStats(inviteList) {
  return inviteList.reduce(
    (stats, invite) => {
      const guests = invite.guests || [];
      return {
        sent: stats.sent + (inviteIsSent(invite) ? 1 : 0),
        accepted: stats.accepted + guests.filter(guestIsAttending).length,
        rejected: stats.rejected + guests.filter(guestIsRejected).length,
      };
    },
    { sent: 0, accepted: 0, rejected: 0 },
  );
}
