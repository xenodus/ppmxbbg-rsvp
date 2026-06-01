import { useEffect, useState } from "react";
import { WEDDING } from "../constants.js";

const TARGET_MS = new Date(WEDDING.dateTime).getTime();

function getSingaporeDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const pick = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
  };
}

function isWeddingDaySingapore(now) {
  const wedding = getSingaporeDateParts(new Date(WEDDING.dateTime));
  const today = getSingaporeDateParts(now);
  return (
    wedding.year === today.year &&
    wedding.month === today.month &&
    wedding.day === today.day
  );
}

function getRemaining(now) {
  const diff = TARGET_MS - now.getTime();
  if (diff <= 0) return null;

  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return { days, hours, minutes, seconds: secs };
}

function getMessage(now) {
  if (isWeddingDaySingapore(now)) {
    return "Today is the day!";
  }
  return "See you soon!";
}

function CountdownUnit({ value, label }) {
  return (
    <div className="countdown-unit">
      <span className="countdown-value">{value}</span>
      <span className="countdown-label">{label}</span>
    </div>
  );
}

export default function Countdown() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = getRemaining(now);

  if (!remaining) {
    return <p className="countdown-message">{getMessage(now)}</p>;
  }

  return (
    <div className="countdown" role="timer" aria-live="polite">
      <CountdownUnit value={String(remaining.days).padStart(2, "0")} label="Days" />
      <CountdownUnit value={String(remaining.hours).padStart(2, "0")} label="Hours" />
      <CountdownUnit
        value={String(remaining.minutes).padStart(2, "0")}
        label="Minutes"
      />
      <CountdownUnit
        value={String(remaining.seconds).padStart(2, "0")}
        label="Seconds"
      />
    </div>
  );
}
