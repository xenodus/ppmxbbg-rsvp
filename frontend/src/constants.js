export const WEDDING = {
  inviteLine: "YOU ARE CORDIALLY INVITED",
  coupleNames: "Alvin & Vivian",
  date: "1 . November . 2026",
  /** Wedding start in Singapore (Asia/Singapore). Used by countdown. */
  dateTime: "2026-11-01T12:00:00+08:00",
  venue: "Hortus @ 18 Marina Gardens Dr, #01-09 Level 2 Flower Dome, Singapore 018953",
};

export const RSVP = {
  bigQuestion: {
    number: "1",
    title: "The Big Question",
    question: "Are you coming to celebrate with us?",
    yes: "Yes! Count me in. 🎉",
    no: "Sad to miss it, but I'll be there in spirit! 🥂",
    declinedMessage:
      "Thank you for letting us know. We'll miss you, but we'll raise a glass in your honour! 🥂",
  },
  solemnisation: {
    number: "2",
    title: "The Solemnisation",
    question:
      "Will you be joining us for the solemnisation, or heading straight for the food?",
    note: "Because our ceremony space is cozy, we're prioritizing seating for our family and elders. But we'd love to know your plans!",
    yes: "Yes! I'd love to witness the \"I do's.\"",
    no: "Skipping the ceremony, but absolutely ready for lunch!",
  },
  parking: {
    number: "3",
    title: "Parking",
    question: "How are you rolling up to the venue? Need a parking coupon?",
    yes: "Vroom vroom, yes please! 🚗",
    no: "Nope, catching a ride / public transport / flying in on a pegasus.",
  },
};

export const RSVP_CUTOFF = {
  /** RSVP closes at midnight in Singapore (Asia/Singapore). */
  dateTime: "2026-09-11T00:00:00+08:00",
  closedMessage:
    "Sorry! We have officially closed our RSVPs. Please give Alvin or Vivian a shout directly if you have any urgent updates or questions!",
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
