import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tenantToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only treat a 401 as "your session was invalidated" when there
    // *was* a session to invalidate — i.e. a token was actually sent
    // with this request. A failed /auth/login (or any other call made
    // while logged out) also comes back 401, but that's just "wrong
    // credentials" or "not logged in", not a session being kicked out.
    // Wiping storage and hard-redirecting on that case was swallowing
    // the real error: the redirect fired before the caller's own
    // catch block ever got to show it, so a bad password silently
    // bounced back to a blank login page instead of saying so.
    const hadToken = !!localStorage.getItem("tenantToken");
    if (err.response?.status === 401 && hadToken) {
      localStorage.removeItem("tenantToken");
      localStorage.removeItem("tenantUser");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);
