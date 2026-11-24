const getBackendBaseUrl = () => {
  const configuredApiUrl = import.meta.env.VITE_API_URL || "";
  if (/^https?:\/\//i.test(configuredApiUrl)) {
    return configuredApiUrl.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  }

  const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL;
  if (configuredBackendUrl) return configuredBackendUrl.replace(/\/$/, "");

  return window.location.origin;
};

const getMediaUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("blob:") || value.startsWith("data:")) return value;
  const baseUrl = getBackendBaseUrl();
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

export default getMediaUrl;
