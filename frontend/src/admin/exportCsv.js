const CSV_HEADERS = [
  "invite_id",
  "is_sent",
  "require_parking",
  "attend_solemnisation",
  "invite_last_updated",
  "guest_id",
  "guest_name",
  "is_attending",
  "dietary_restriction",
  "guest_last_updated",
];

function formatBoolForCsv(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function escapeCsvField(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function inviteRow(invite, guest) {
  return [
    invite.id,
    formatBoolForCsv(invite.is_sent),
    formatBoolForCsv(invite.require_parking),
    formatBoolForCsv(invite.attend_solemnisation),
    invite.last_updated ?? "",
    guest?.id ?? "",
    guest?.name ?? "",
    formatBoolForCsv(guest?.is_attending),
    guest?.dietary_restriction ?? "",
    guest?.last_updated ?? "",
  ].map(escapeCsvField);
}

export function invitesToCsv(invites) {
  const rows = [CSV_HEADERS.map(escapeCsvField).join(",")];

  for (const invite of invites) {
    const guests = invite.guests || [];
    if (guests.length === 0) {
      rows.push(inviteRow(invite, null).join(","));
      continue;
    }
    for (const guest of guests) {
      rows.push(inviteRow(invite, guest).join(","));
    }
  }

  return `\uFEFF${rows.join("\n")}\n`;
}

export function downloadInvitesCsv(invites) {
  const csv = invitesToCsv(invites);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rsvp-invites-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
