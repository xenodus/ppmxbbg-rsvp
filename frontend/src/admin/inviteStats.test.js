import assert from "node:assert/strict";
import test from "node:test";
import {
  computeInviteStats,
  countGuestsInInvites,
  guestIsAttending,
  guestIsRejected,
} from "./inviteStats.js";

const sampleInvites = [
  {
    id: "a",
    is_sent: true,
    require_parking: true,
    guests: [
      { id: 1, name: "Jane", is_attending: true },
      { id: 2, name: "John", is_attending: false },
    ],
  },
  {
    id: "b",
    is_sent: true,
    require_parking: false,
    guests: [
      { id: 3, name: "Bob", is_attending: true },
      { id: 4, name: "Sue", is_attending: true },
    ],
  },
  {
    id: "c",
    is_sent: false,
    guests: [{ id: 5, name: "Pat" }],
  },
];

test("guestIsAttending counts only guests who accepted", () => {
  assert.equal(guestIsAttending({ is_attending: true }), true);
  assert.equal(guestIsAttending({ is_attending: false }), false);
  assert.equal(guestIsAttending({}), false);
  assert.equal(guestIsAttending({ is_attending: null }), false);
});

test("guestIsRejected counts only guests who declined after responding", () => {
  assert.equal(guestIsRejected({ is_attending: false }), true);
  assert.equal(guestIsRejected({ is_attending: true }), false);
  assert.equal(guestIsRejected({}), false);
});

test("computeInviteStats counts sent invites and guest responses separately", () => {
  assert.deepEqual(computeInviteStats(sampleInvites), {
    sent: 2,
    unsent: 1,
    parking: 1,
    accepted: 3,
    rejected: 1,
    totalInvites: 3,
    totalGuests: 5,
  });
});

test("computeInviteStats includes invite and guest totals for display", () => {
  const stats = computeInviteStats(sampleInvites);

  assert.equal(stats.totalInvites, sampleInvites.length);
  assert.equal(stats.totalGuests, countGuestsInInvites(sampleInvites));
  assert.equal(stats.sent, stats.totalInvites - stats.unsent);
  assert.equal(stats.sent + stats.unsent, stats.totalInvites);
  assert.equal(stats.accepted + stats.rejected, stats.totalGuests - 1);
});

test("parking is the total number of invites that require parking, not guests", () => {
  const stats = computeInviteStats(sampleInvites);

  assert.equal(stats.parking, 1);
  assert.notEqual(
    stats.parking,
    sampleInvites.flatMap((invite) => invite.guests || []).length,
  );
});

test("accepted is the total number of attending guests, not invites", () => {
  const stats = computeInviteStats(sampleInvites);
  const attendingGuests = sampleInvites
    .flatMap((invite) => invite.guests || [])
    .filter(guestIsAttending).length;

  assert.equal(stats.accepted, attendingGuests);
  assert.notEqual(stats.accepted, sampleInvites.filter((invite) => inviteHasAttending(invite)).length);
});

test("countGuestsInInvites counts all guests by default", () => {
  assert.equal(countGuestsInInvites(sampleInvites), 5);
});

test("countGuestsInInvites with accepted filter counts only attending guests", () => {
  const invitesWithMixedHousehold = [
    {
      id: "household",
      guests: [
        { id: 1, name: "Jane", is_attending: true },
        { id: 2, name: "John", is_attending: false },
        { id: 3, name: "Joan" },
      ],
    },
  ];

  assert.equal(countGuestsInInvites(invitesWithMixedHousehold), 3);
  assert.equal(countGuestsInInvites(invitesWithMixedHousehold, "accepted"), 1);
  assert.equal(computeInviteStats(invitesWithMixedHousehold).accepted, 1);
});

test("computeInviteStats uses all guests as totalGuests, not only declined guests", () => {
  const stats = computeInviteStats(sampleInvites);

  assert.equal(stats.totalGuests, countGuestsInInvites(sampleInvites));
  assert.notEqual(stats.totalGuests, countGuestsInInvites(sampleInvites, "rejected"));
});

test("countGuestsInInvites with rejected filter counts only declined guests", () => {
  assert.equal(countGuestsInInvites(sampleInvites, "rejected"), 1);
  assert.notEqual(countGuestsInInvites(sampleInvites, "rejected"), countGuestsInInvites(sampleInvites));
});

function inviteHasAttending(invite) {
  return (invite.guests || []).some(guestIsAttending);
}
