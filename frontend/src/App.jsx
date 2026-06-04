import { useState } from "react";
import Countdown from "./components/Countdown.jsx";
import Faq from "./components/Faq.jsx";
import RsvpForm from "./components/RsvpForm.jsx";
import SiteNav from "./components/SiteNav.jsx";
import { WEDDING } from "./constants.js";

function Divider() {
  return (
    <div className="divider" aria-hidden="true">
      <span className="divider-line" />
      <span className="divider-diamond">✦</span>
      <span className="divider-line" />
    </div>
  );
}

export default function App() {
  const [inviteValid, setInviteValid] = useState(false);

  return (
    <div className="page">
      <SiteNav coupleNames={WEDDING.coupleNames} inviteValid={inviteValid} />

      <header className="header">
        <p className="eyebrow">{WEDDING.inviteLine}</p>
        <h1 className="couple-names">{WEDDING.coupleNames}</h1>
        <p className="wedding-date">{WEDDING.date}</p>
        <Countdown />
      </header>

      <Divider />

      <main>
        <RsvpForm onInviteValidChange={setInviteValid} />
      </main>

      {inviteValid && (
        <>
          <Divider />

          <Faq />
        </>
      )}

      <Divider />

      <footer className="footer">
        <p>{WEDDING.venue}</p>
      </footer>
    </div>
  );
}
