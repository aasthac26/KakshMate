const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

export async function registerUser(name, email, password, gender) {
  const params = new URLSearchParams({ name, email, password, gender });
  const res = await fetch(`${API_URL}/register?${params}`, { method: "POST" });
  return res.json();
}

export async function loginUser(email, password) {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });
  return res.json();
}

export async function getMyProfile() {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function updatePreference(lookingFor, city, area) {
  const params = new URLSearchParams();
  if (lookingFor) params.append("looking_for", lookingFor);
  if (city !== undefined) params.append("city", city);
  if (area !== undefined) params.append("area", area);
  const res = await fetch(`${API_URL}/users/me/preference?${params}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function writeConfession(text) {
  const params = new URLSearchParams({ text });
  const res = await fetch(`${API_URL}/confessions?${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function getMyConfessions() {
  const res = await fetch(`${API_URL}/confessions/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function deleteConfession(id) {
  const res = await fetch(`${API_URL}/confessions/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function getDiscover(city, area) {
  const params = new URLSearchParams();
  if (city) params.append("city", city);
  if (area) params.append("area", area);
  const queryString = params.toString();
  const res = await fetch(`${API_URL}/discover${queryString ? `?${queryString}` : ""}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function swipeUser(targetId, liked) {
  const params = new URLSearchParams({ liked });
  const res = await fetch(`${API_URL}/swipe/${targetId}?${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function getMatches() {
  const res = await fetch(`${API_URL}/matches`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function getMessages(matchId) {
  const res = await fetch(`${API_URL}/matches/${matchId}/messages`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function sendMessage(matchId, text) {
  const params = new URLSearchParams({ text });
  const res = await fetch(`${API_URL}/matches/${matchId}/messages?${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}
export async function getLikesReceived() {
  const res = await fetch(`${API_URL}/likes/received`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export async function getPassedProfiles() {
  const res = await fetch(`${API_URL}/passed`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}
export async function getLikedProfiles() {
  const res = await fetch(`${API_URL}/liked`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}
export async function undoSwipe(targetId) {
  const res = await fetch(`${API_URL}/swipe/${targetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}