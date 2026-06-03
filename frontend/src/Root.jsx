import { useMemo } from "react";
import App from "./App.jsx";
import LandingPage from "./components/LandingPage.jsx";

function getInviteId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id")?.trim() || "";
}

export default function Root() {
  const inviteId = useMemo(() => getInviteId(), []);

  if (!inviteId) {
    return <LandingPage />;
  }

  return <App />;
}
