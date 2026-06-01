import { API_BASE_URL } from "./constants.js";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || "Something went wrong. Please try again.";
    throw new Error(message);
  }

  return data;
}

export function fetchInvite(id) {
  return request(`/invite?id=${encodeURIComponent(id)}`);
}

export function saveInvite(payload) {
  return request("/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveGuest(payload) {
  return request("/guest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
