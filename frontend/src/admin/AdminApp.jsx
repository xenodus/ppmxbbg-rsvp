import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearSession,
  createInvite,
  deleteInvite,
  getStoredToken,
  listInvites,
  login,
  markInviteSent,
  setStoredToken,
  updateGuestName,
} from "./adminApi.js";
import { downloadInvitesCsv } from "./exportCsv.js";
import {
  buildInviteMessage,
  clearStoredInviteMessageTemplate,
  DEFAULT_INVITE_MESSAGE_TEMPLATE,
  getStoredInviteMessageTemplate,
  setStoredInviteMessageTemplate,
} from "./inviteMessage.js";
import { generateQrCodeDataUrl } from "./qrCode.js";

function guestSiteOrigin() {
  const path = window.location.pathname.replace(/admin\.html$/, "");
  return `${window.location.origin}${path}`;
}

function inviteLink(id) {
  return `${guestSiteOrigin()}?id=${encodeURIComponent(id)}`;
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy is not supported in this browser.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

function formatBool(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function guestResponded(guest) {
  return guest.is_attending !== undefined && guest.is_attending !== null;
}

function inviteSummary(invite) {
  const guests = invite.guests || [];
  const responded = guests.filter(guestResponded).length;
  const attending = guests.filter((g) => g.is_attending === true).length;
  return { guests: guests.length, responded, attending };
}

function inviteMatchesGuestSearch(invite, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (invite.guests || []).some((guest) =>
    (guest.name || "").toLowerCase().includes(needle),
  );
}

function filterInvitesByGuestName(invites, query) {
  return invites.filter((invite) => inviteMatchesGuestSearch(invite, query));
}

function countGuestsInInvites(inviteList) {
  return inviteList.reduce((sum, invite) => sum + (invite.guests?.length ?? 0), 0);
}

function formatInviteListHeading(invites, filteredInvites, searchActive) {
  const inviteCount = filteredInvites.length;
  const guestCount = countGuestsInInvites(filteredInvites);
  if (searchActive) {
    const totalInvites = invites.length;
    const totalGuests = countGuestsInInvites(invites);
    return ` (${inviteCount} of ${totalInvites} invites · ${guestCount} of ${totalGuests} guests)`;
  }
  return ` (${inviteCount} invites · ${guestCount} guests)`;
}

function AdminFooter() {
  return (
    <footer className="admin-footer">
      <p>© 2026 alvinandvivian.rsvp</p>
    </footer>
  );
}

function LoginForm({ onSuccess, error, loading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    onSuccess(username, password);
  }

  return (
    <div className="admin-login-card form-card">
      <h1>RSVP Admin</h1>
      <p className="admin-muted">Sign in with your admin credentials.</p>
      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="admin-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="admin-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error ? <p className="banner banner-error">{error}</p> : null}
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function InviteQrCode({ url }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    generateQrCodeDataUrl(url, { width: 128 })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!src) return null;

  return (
    <img
      className="admin-invite-qr"
      src={src}
      alt="QR code for invite link"
      width={96}
      height={96}
    />
  );
}

const ADMIN_HEADER_SCROLL_DOWN_THRESHOLD = 48;
const ADMIN_HEADER_SCROLL_UP_THRESHOLD = 12;

function AdminHeader({
  editingMessageTemplate,
  onToggleMessageTemplate,
  loading,
  invites,
  onDownloadCsv,
  onLogout,
}) {
  const headerRef = useRef(null);
  const scrolledRef = useRef(false);
  const [scrolled, setScrolled] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const wasScrolled = scrolledRef.current;
      let nextScrolled = wasScrolled;

      if (!wasScrolled && scrollY > ADMIN_HEADER_SCROLL_DOWN_THRESHOLD) {
        nextScrolled = true;
        const height = headerRef.current?.offsetHeight ?? 0;
        if (height > 0) {
          setSpacerHeight(height);
        }
      } else if (wasScrolled && scrollY < ADMIN_HEADER_SCROLL_UP_THRESHOLD) {
        nextScrolled = false;
        setSpacerHeight(0);
      }

      if (nextScrolled !== wasScrolled) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!scrolled) {
      setMenuOpen(false);
    }
  }, [scrolled]);

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

  function handleToggleMessageTemplate() {
    closeMenu();
    onToggleMessageTemplate();
  }

  function handleDownloadCsv() {
    closeMenu();
    onDownloadCsv();
  }

  function handleLogout() {
    closeMenu();
    onLogout();
  }

  const actionButtons = (
    <>
      <button
        type="button"
        className="secondary-btn"
        onClick={handleToggleMessageTemplate}
      >
        {editingMessageTemplate ? "Close editor" : "Edit message"}
      </button>
      <button
        type="button"
        className="secondary-btn"
        disabled={loading || invites.length === 0}
        onClick={handleDownloadCsv}
      >
        Download CSV
      </button>
      <button type="button" className="secondary-btn" onClick={handleLogout}>
        Sign out
      </button>
    </>
  );

  return (
    <>
      {spacerHeight > 0 ? (
        <div
          className="admin-header-spacer"
          style={{ height: spacerHeight }}
          aria-hidden="true"
        />
      ) : null}
      <header
        ref={headerRef}
        className={`admin-header${scrolled ? " is-compact" : ""}`}
      >
        <div className="admin-header-title">
          <h1>Invites &amp; responses</h1>
          <p className="admin-muted">Manage invitations and view RSVP data.</p>
        </div>
        {scrolled ? (
          <button
            type="button"
            className={`admin-header-menu-btn${menuOpen ? " is-hidden" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="admin-actions-drawer"
            onClick={() => setMenuOpen(true)}
          >
            <span className="admin-header-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Actions</span>
          </button>
        ) : (
          <div className="admin-header-actions">{actionButtons}</div>
        )}
      </header>

      {scrolled ? (
        <>
          <div
            className={`nav-overlay${menuOpen ? " is-visible" : ""}`}
            aria-hidden={!menuOpen}
            onClick={closeMenu}
          />

          <aside
            id="admin-actions-drawer"
            className={`nav-drawer admin-nav-drawer${menuOpen ? " is-open" : ""}`}
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

            <h2 className="nav-drawer-title admin-drawer-title">Invites &amp; responses</h2>

            <nav className="admin-drawer-actions" aria-label="Admin actions">
              <button
                type="button"
                className="admin-drawer-action"
                onClick={handleToggleMessageTemplate}
              >
                {editingMessageTemplate ? "Close editor" : "Edit message"}
              </button>
              <button
                type="button"
                className="admin-drawer-action"
                disabled={loading || invites.length === 0}
                onClick={handleDownloadCsv}
              >
                Download CSV
              </button>
              <button type="button" className="admin-drawer-action" onClick={handleLogout}>
                Sign out
              </button>
            </nav>
          </aside>
        </>
      ) : null}
    </>
  );
}

function MessageTemplateEditor({ template, onSave, onClose }) {
  const [draft, setDraft] = useState(template);

  useEffect(() => {
    setDraft(template);
  }, [template]);

  function handleSave(event) {
    event.preventDefault();
    onSave(draft);
  }

  function handleReset() {
    if (
      window.confirm(
        "Reset the message template to the default? Your custom text will be discarded.",
      )
    ) {
      onSave(DEFAULT_INVITE_MESSAGE_TEMPLATE, { reset: true });
      setDraft(DEFAULT_INVITE_MESSAGE_TEMPLATE);
    }
  }

  return (
    <section className="form-card admin-message-template">
      <h2>Edit message template</h2>
      <p className="admin-muted">
        Used by every <strong>Copy message</strong> button. Placeholders:{" "}
        <code>[Names]</code> (guest names), <code>[Link]</code> (RSVP link).
      </p>
      <form onSubmit={handleSave}>
        <textarea
          className="admin-textarea admin-message-template-input"
          rows={16}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck
        />
        <div className="admin-message-template-actions">
          <button type="submit" className="primary-btn">
            Save template
          </button>
          <button type="button" className="secondary-btn" onClick={handleReset}>
            Reset to default
          </button>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </section>
  );
}

function EditableGuestName({ guest, disabled, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(guest.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(guest.name);
    }
  }, [guest.name, editing]);

  async function handleSave() {
    const name = draft.trim();
    if (!name) {
      alert("Guest name cannot be empty.");
      return;
    }
    if (name === guest.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateGuestName(guest.id, name);
      setEditing(false);
      await onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(guest.name);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="admin-guest-name-cell">
        <span>{guest.name}</span>
        <button
          type="button"
          className="admin-inline-btn"
          disabled={disabled}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="admin-guest-name-edit">
      <input
        className="admin-input admin-guest-name-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={saving}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          } else if (e.key === "Escape") {
            e.preventDefault();
            handleCancel();
          }
        }}
      />
      <div className="admin-guest-name-edit-actions">
        <button
          type="button"
          className="admin-inline-btn"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="admin-inline-btn"
          disabled={saving}
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function InviteRow({ invite, messageTemplate, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const summary = inviteSummary(invite);
  const guestNameList = (invite.guests || []).map((g) => g.name);

  useEffect(() => {
    if (!linkCopied) return undefined;
    const timer = window.setTimeout(() => setLinkCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [linkCopied]);

  useEffect(() => {
    if (!messageCopied) return undefined;
    const timer = window.setTimeout(() => setMessageCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [messageCopied]);

  async function handleCopyLink() {
    try {
      await copyToClipboard(inviteLink(invite.id));
      setLinkCopied(true);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCopyMessage() {
    try {
      const message = buildInviteMessage({
        guestNames: guestNameList,
        link: inviteLink(invite.id),
        template: messageTemplate,
      });
      await copyToClipboard(message);
      setMessageCopied(true);
    } catch (err) {
      alert(err.message);
    }
  }

  async function run(action) {
    setBusy(true);
    try {
      await action();
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="admin-invite-card">
      <div className="admin-invite-top">
        <div className="admin-invite-header">
          <strong>{invite.guests?.map((g) => g.name).join(", ") || "No guests"}</strong>
          <p className="admin-muted admin-id">ID: {invite.id}</p>
        </div>
        <InviteQrCode url={inviteLink(invite.id)} />
      </div>
      <div className="admin-invite-actions">
        <button
          type="button"
          className={linkCopied ? "secondary-btn admin-copy-done" : "secondary-btn"}
          disabled={busy}
          onClick={handleCopyLink}
        >
          {linkCopied ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          className={messageCopied ? "secondary-btn admin-copy-done" : "secondary-btn"}
          disabled={busy || guestNameList.length === 0}
          onClick={handleCopyMessage}
        >
          {messageCopied ? "Copied!" : "Copy message"}
        </button>
        <button
          type="button"
          className="secondary-btn admin-mark-sent-btn"
          disabled={busy}
          onClick={() =>
            run(() => markInviteSent(invite.id, !(invite.is_sent === true)))
          }
        >
          {invite.is_sent ? "Mark unsent" : "Mark sent"}
        </button>
        <button
          type="button"
          className="secondary-btn admin-danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Delete this invite and all guests?")) {
              run(() => deleteInvite(invite.id));
            }
          }}
        >
          Delete
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "Responses"}
        </button>
      </div>
      <p className="admin-summary">
        {summary.responded}/{summary.guests} guests responded · {summary.attending} attending
        · Sent: {formatBool(invite.is_sent)}
        · Parking: {formatBool(invite.require_parking)}
      </p>
      {expanded ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Attending</th>
                <th>Solemnisation</th>
                <th>Dietary</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {(invite.guests || []).map((guest) => (
                <tr key={guest.id}>
                  <td>
                    <EditableGuestName
                      guest={guest}
                      disabled={busy}
                      onSaved={onRefresh}
                    />
                  </td>
                  <td>{formatBool(guest.is_attending)}</td>
                  <td>{formatBool(guest.attend_solemnisation)}</td>
                  <td>{guest.dietary_restriction || "—"}</td>
                  <td>{guest.last_updated || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(Boolean(getStoredToken()));
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [pageError, setPageError] = useState("");
  const [guestNames, setGuestNames] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState(getStoredInviteMessageTemplate);
  const [editingMessageTemplate, setEditingMessageTemplate] = useState(false);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const data = await listInvites();
      setInvites(Array.isArray(data) ? data : []);
      setAuthed(true);
    } catch (err) {
      if (err.status === 401) {
        clearSession();
        setAuthed(false);
      } else {
        setPageError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getStoredToken()) {
      loadInvites();
    }
  }, [loadInvites]);

  async function handleLogin(username, password) {
    setLoginError("");
    setLoading(true);
    try {
      const data = await login(username, password);
      setStoredToken(data.token);
      setAuthed(true);
      await loadInvites();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const guests = guestNames
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (guests.length === 0) {
      alert("Add at least one guest name (one per line).");
      return;
    }
    setCreating(true);
    try {
      const data = await createInvite(guests);
      setGuestNames("");
      if (data.invite?.id) {
        try {
          await copyToClipboard(inviteLink(data.invite.id));
        } catch (err) {
          alert(
            `Invite created, but the link could not be copied automatically:\n\n${inviteLink(data.invite.id)}\n\n${err.message}`,
          );
        }
      }
      await loadInvites();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    clearSession();
    setAuthed(false);
    setInvites([]);
  }

  function handleSaveMessageTemplate(template, { reset = false } = {}) {
    if (reset) {
      clearStoredInviteMessageTemplate();
    } else {
      setStoredInviteMessageTemplate(template);
    }
    setMessageTemplate(template);
    setEditingMessageTemplate(false);
  }

  const filteredInvites = filterInvitesByGuestName(invites, guestSearch);
  const searchActive = guestSearch.trim().length > 0;

  return (
    <div className="admin-page">
      {!authed ? (
        <LoginForm onSuccess={handleLogin} error={loginError} loading={loading} />
      ) : (
        <>
          <AdminHeader
            editingMessageTemplate={editingMessageTemplate}
            onToggleMessageTemplate={() => setEditingMessageTemplate((open) => !open)}
            loading={loading}
            invites={invites}
            onDownloadCsv={() => downloadInvitesCsv(invites)}
            onLogout={handleLogout}
          />

          {pageError ? <p className="banner banner-error">{pageError}</p> : null}

          {editingMessageTemplate ? (
            <MessageTemplateEditor
              template={messageTemplate}
              onSave={handleSaveMessageTemplate}
              onClose={() => setEditingMessageTemplate(false)}
            />
          ) : null}

          <section className="form-card admin-create">
            <h2>Create invite</h2>
            <p className="admin-muted">One guest name per line. The invite link is copied after create.</p>
            <form onSubmit={handleCreate}>
              <textarea
                className="admin-textarea"
                rows={4}
                placeholder={"Jane Doe\nJohn Doe"}
                value={guestNames}
                onChange={(e) => setGuestNames(e.target.value)}
              />
              <button type="submit" className="primary-btn" disabled={creating}>
                {creating ? "Creating…" : "Create invite"}
              </button>
            </form>
          </section>

          <section className="admin-list-section">
            <h2>
              All invites
              {formatInviteListHeading(invites, filteredInvites, searchActive)}
            </h2>
            <div className="field-group">
              <label className="field-label" htmlFor="guest-search">
                Search by guest name
              </label>
              <input
                id="guest-search"
                type="search"
                className="admin-input"
                placeholder="e.g. Jane"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            {loading && invites.length === 0 ? <p className="admin-muted">Loading…</p> : null}
            {!loading && invites.length > 0 && searchActive && filteredInvites.length === 0 ? (
              <p className="admin-muted">No invites match that guest name.</p>
            ) : null}
            <div className="admin-invite-list">
              {filteredInvites.map((invite) => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  messageTemplate={messageTemplate}
                  onRefresh={loadInvites}
                />
              ))}
            </div>
          </section>
        </>
      )}
      <AdminFooter />
    </div>
  );
}
