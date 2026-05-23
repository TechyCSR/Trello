import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

export function setApiUser(userId: number | null) {
  if (userId) {
    api.defaults.headers.common["X-USER-ID"] = String(userId);
  } else {
    delete api.defaults.headers.common["X-USER-ID"];
  }
}

export const apiUrl = API_URL;
