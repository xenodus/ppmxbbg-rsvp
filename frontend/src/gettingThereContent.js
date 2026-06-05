const PARKING_MAP_URL = "https://maps.app.goo.gl/t6LYrW5VW9JJAzaq8";

export const GETTING_THERE = {
  pageTitle: "🗺 Getting to the Wedding!",
  adventure: {
    title: "🚗 Choose Your Adventure",
    options: [
      {
        title: '🚕 Option A: The "Drop Me Off" (Grab / Taxi)',
        lines: [
          {
            label: "Destination Set:",
            text: "Gardens by the Bay, Pick-Up/Drop-Off Point 1.",
          },
          {
            label: "The Next Step:",
            text: "Once you alight, look out for the Hortus signage at the drop-off point. Hop right onto the complimentary Hortus buggy! (Service starts at 11:00 AM, runs every 8–12 minutes).",
          },
        ],
      },
      {
        title: '🚙 Option B: The "I\'m Driving" (Parking)',
        lines: [
          {
            label: "Where to Park:",
            text: "Head straight down to the Main Entrance – Basement Car Park.",
          },
          {
            label: "Navigation Link:",
            type: "link",
            href: PARKING_MAP_URL,
            linkText: "this link",
          },
          {
            label: "The Next Step:",
            text: "Walk up to the ground level drop-off point to catch the Hortus buggy!",
          },
        ],
        note: "Pssstttt...! Don't forget to indicate in your RSVP if you need a parking coupon!",
      },
      {
        title: "🚇 Option C: The Public Explorer (MRT & Walking)",
        routes: [
          {
            title:
              "Route 1: Via Gardens by the Bay MRT Station (Thomson-East Coast Line - TE22)",
            steps: [
              "Take Exit 1,",
              "Follow the signs toward Gardens by the Bay.",
              "Cross the road and turn right into the drop-off point.",
              "Look out for the Hortus signage at the drop-off point. Hop right onto the complimentary Hortus buggy! (Service starts at 11:00 AM, runs every 8–12 minutes).",
            ],
          },
          {
            title: "Route 2: Via MRT Station (Circle / Downtown Line - CE1/DT16)",
            steps: [
              "Take Exit C (towards Marina Bay Sands' Hotel Tower 3).",
              "Walk across the outdoor driveway towards the water feature, keeping to your right to find the path leading to Marina Reservoir.",
              "At the end of the path, turn right under the Marina Bridge.",
              "Walk straight, passing the Active Garden and strolling along the Jubilee Walk until you reach the shared entrance for Hortus and Marguerite.",
              "Step inside, take the lift up to Level 2, and you've arrived at Hortus! 🥳",
            ],
          },
        ],
      },
    ],
  },
  wetWeather: {
    title: '🌧 ⛈ The "Oh No, It\'s Raining!" Plan (Wet Weather)',
    paragraphs: [
      "Here's the game plan if the skies are moved by our wedding!",
      "The buggies are secretly terrified of the rain 🛺😱⛈, and will unfortunately not be operating in the event of wet weather. Don't panic, though! If you are arriving at the drop-off/pick-up point, simply follow the signages to the Flower Dome (the route is fully sheltered from there).",
      "The friendly staff of Hortus will be stationed at the Flower Dome entrance to welcome you to our wedding. 🥳",
    ],
  },
};
