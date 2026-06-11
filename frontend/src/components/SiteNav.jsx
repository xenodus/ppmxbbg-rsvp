import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 48;

export default function SiteNav({ coupleNames, onRsvpOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const sectionLinks = onRsvpOpen
    ? [
        { href: "#join-us", label: "When" },
        { href: "#where", label: "Where" },
        { href: "#what", label: "Schedule" },
        { href: "#getting-there", label: "Getting There" },
        { href: "#faq", label: "FAQ" },
      ]
    : [];

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleRsvpClick() {
    closeMenu();
    onRsvpOpen?.();
  }

  return (
    <>
      <button
        type="button"
        className={`nav-fab${scrolled ? " is-scrolled" : ""}${menuOpen ? " is-hidden" : ""}`}
        aria-label="Open menu"
        aria-hidden={menuOpen}
        tabIndex={menuOpen ? -1 : 0}
        aria-expanded={menuOpen}
        aria-controls="site-nav-drawer"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="nav-fab-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="nav-fab-label">Menu</span>
      </button>

      <div
        className={`nav-overlay${menuOpen ? " is-visible" : ""}`}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />

      <aside
        id="site-nav-drawer"
        className={`nav-drawer${menuOpen ? " is-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className="nav-drawer-close"
          aria-label="Close menu"
          onClick={closeMenu}
        >
          ×
        </button>

        <h2 className="nav-drawer-title">{coupleNames}</h2>

        {sectionLinks.length > 0 ? (
          <nav className="nav-drawer-links" aria-label="Page sections">
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={closeMenu}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="nav-drawer-footer">
          {onRsvpOpen ? (
            <button type="button" className="nav-drawer-rsvp" onClick={handleRsvpClick}>
              RSVP
            </button>
          ) : (
            <a href="#rsvp" className="nav-drawer-rsvp" onClick={closeMenu}>
              RSVP
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
