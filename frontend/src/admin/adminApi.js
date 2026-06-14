import { API_BASE_URL } from "../constants.js";

const TOKEN_KEY = "admin_token";

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setStoredToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function clearSession() {
  setStoredToken("");
}

function networkErrorMessage(err) {
  if (err?.message !== "Failed to fetch") {
    return err?.message || "Request failed";
  }
  if (!API_BASE_URL) {
    return "Cannot reach the API. For local dev, set VITE_API_PROXY_TARGET in frontend/.env (see README).";
  }
  return (
    "Cannot reach the API (browser blocked the request). Check that VITE_API_BASE_URL " +
    "matches your API Gateway URL (no /prod suffix unless the gateway uses a stage path), " +
    "that /admin/* routes exist, and that Lambda FRONTEND_ORIGIN is exactly your admin " +
    "site origin (e.g. https://YOUR_ID.cloudfront.net with no trailing slash). " +
    "Path-style S3 URLs use origin https://s3.REGION.amazonaws.com (no bucket name). " +
    "S3, path-style S3, and CloudFront origins are allowed automatically after the API is redeployed."
  );
}

async function request(path, options = {}) {
  const token = getStoredToken();
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    throw new Error(networkErrorMessage(err));
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || "Request failed";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
}

export function login(username, password) {
  return request("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function listInvites() {
  return request("/admin/invites");
}

export function createInvite(guests) {
  return request("/admin/invites", {
    method: "POST",
    body: JSON.stringify({ guests }),
  });
}

export function markInviteSent(id, isSent) {
  return request("/admin/invites", {
    method: "PATCH",
    body: JSON.stringify({ id, is_sent: isSent }),
  });
}

export function deleteInvite(id) {
  return request(`/admin/invites?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function updateGuestName(id, name) {
  return request("/admin/invites", {
    method: "PATCH",
    body: JSON.stringify({ guest_id: id, name }),
  });
}
