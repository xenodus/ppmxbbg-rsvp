import { useCallback, useEffect, useState } from "react";
import {
  clearSession,
  createInvite,
  deleteInvite,
  getStoredToken,
  listInvites,
  login,
  markInviteSent,
  setStoredToken,
} from "./adminApi.js";

function guestSiteOrigin() {
  const path = window.location.pathname.replace(/admin\.html$/, "");
  return `${window.location.origin}${path}`;
}

function inviteLink(id) {
  return `${guestSiteOrigin()}?id=${encodeURIComponent(id)}`;
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

function InviteRow({ invite, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const summary = inviteSummary(invite);

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
      <div className="admin-invite-header">
        <div>
          <strong>{invite.guests?.map((g) => g.name).join(", ") || "No guests"}</strong>
          <p className="admin-muted admin-id">ID: {invite.id}</p>
        </div>
        <div className="admin-invite-actions">
          <button
            type="button"
            className="secondary-btn"
            disabled={busy}
            onClick={() => navigator.clipboard.writeText(inviteLink(invite.id))}
          >
            Copy link
          </button>
          <button
            type="button"
            className="secondary-btn"
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
      </div>
      <p className="admin-summary">
        {summary.responded}/{summary.guests} guests responded · {summary.attending} attending
        · Sent: {formatBool(invite.is_sent)}
        · Parking: {formatBool(invite.require_parking)}
        · Solemnisation: {formatBool(invite.attend_solemnisation)}
      </p>
      {expanded ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Attending</th>
              <th>Dietary</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {(invite.guests || []).map((guest) => (
              <tr key={guest.id}>
                <td>{guest.name}</td>
                <td>{formatBool(guest.is_attending)}</td>
                <td>{guest.dietary_restriction || "—"}</td>
                <td>{guest.last_updated || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [creating, setCreating] = useState(false);

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
        await navigator.clipboard.writeText(inviteLink(data.invite.id));
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

  if (!authed) {
    return (
      <div className="admin-page">
        <LoginForm onSuccess={handleLogin} error={loginError} loading={loading} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Invites &amp; responses</h1>
          <p className="admin-muted">Manage invitations and view RSVP data.</p>
        </div>
        <button type="button" className="secondary-btn" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      {pageError ? <p className="banner banner-error">{pageError}</p> : null}

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

      <section>
        <h2>All invites ({invites.length})</h2>
        {loading && invites.length === 0 ? <p className="admin-muted">Loading…</p> : null}
        <div className="admin-invite-list">
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} onRefresh={loadInvites} />
          ))}
        </div>
      </section>
    </div>
  );
}
