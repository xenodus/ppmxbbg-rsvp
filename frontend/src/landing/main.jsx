import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LandingApp from "./LandingApp.jsx";
import { waitForLandingAssets } from "./waitForLandingAssets.js";
import "../index.css";
import "./landing.css";

const root = createRoot(document.getElementById("root"));

waitForLandingAssets().finally(() => {
  root.render(
    <StrictMode>
      <LandingApp />
    </StrictMode>,
  );

  requestAnimationFrame(() => {
    document.documentElement.classList.add("landing-ready");
  });
});
