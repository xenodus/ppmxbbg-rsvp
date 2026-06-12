/** Salutation names for "Dear …" (e.g. "Jane", "Jane and John", "Jane, John, and Bob"). */
export function formatGuestNamesForSalutation(names) {
  const list = (names || []).map((name) => name?.trim()).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

export function buildInviteMessage({ guestNames, link }) {
  const names = formatGuestNamesForSalutation(guestNames);
  return `Dear ${names},
We're getting married! 💍

We would absolutely love for you to join us and celebrate the start of our greatest adventure yet.

The Details:
Date: Saturday, 1 November 2026
Venue: Hortus, Flower Dome at Gardens by the Bay (18 Marina Gardens Dr, #01-09, Singapore 018953)

The Game Plan:
11:00 AM: Tea Ceremony (Feel free to join the fun!)
12:00 PM: Our Solemnisation
1:00 PM: Lunch is served! ☕️🍽️

Please let us know if you can make it by 11 September 2026 via this link: ${link}

Your presence means the world to us, and we can't wait to celebrate with you surrounded by beautiful blooms!

With love,
Alvin & Vivian`;
}
