import axios from "axios";
import { clearTokens, getTokens, setTokens } from "../utils/tokenStorage.js";

const client = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/"}`,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = getTokens();
      if (tokens?.refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/"}auth/token/refresh/`,
            { refresh: tokens.refresh }
          );
          const nextTokens = { access: data.access, refresh: tokens.refresh };
          setTokens(nextTokens);
          originalRequest.headers.Authorization = `Bearer ${nextTokens.access}`;
          return client(originalRequest);
        } catch (refreshError) {
          clearTokens();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
