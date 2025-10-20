const STORAGE_KEY = "medical_records_tokens";

export const getTokens = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to parse stored tokens", error);
    return null;
  }
};

export const setTokens = (tokens) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

export const clearTokens = () => {
  localStorage.removeItem(STORAGE_KEY);
};
