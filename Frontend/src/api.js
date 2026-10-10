import axios from "axios";

let appLockToken = null;

export const setAppLockToken = (token) => {
  appLockToken = token || null;
};

export const getAppLockToken = () => appLockToken;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (appLockToken) {
    config.headers = config.headers || {};
    config.headers["X-App-Lock-Token"] = appLockToken;
  }

  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 423 && error.response?.data?.code === "APP_LOCK_REQUIRED") {
    window.dispatchEvent(new Event("app-lock-required"));
  }
  return Promise.reject(error);
});

export default api;