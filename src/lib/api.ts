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
    if (err.response?.status === 401) {
      localStorage.removeItem("tenantToken");
      localStorage.removeItem("tenantUser");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
