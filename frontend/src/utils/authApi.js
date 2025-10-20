import client from "../api/client.js";
import { clearTokens, getTokens, setTokens } from "./tokenStorage.js";

export const signup = async (payload) => {
  const { data } = await client.post("auth/signup/", payload);
  return data;
};

export const login = async (credentials) => {
  const { data } = await client.post("auth/login/", credentials);
  setTokens({ access: data.access, refresh: data.refresh });
  return data;
};

export const logout = async () => {
  const tokens = getTokens();
  if (tokens?.refresh) {
    try {
      await client.post("auth/logout/", { refresh: tokens.refresh });
    } catch (error) {
      console.warn("Logout request failed", error);
    }
  }
  clearTokens();
};

export const getProfile = async () => {
  const { data } = await client.get("auth/me/");
  return data;
};

export const listPatients = async () => {
  const { data } = await client.get("patients/");
  return data;
};

export const createPatient = async (payload) => {
  const { data } = await client.post("patients/", payload);
  return data;
};

export const listDoctors = async () => {
  const { data } = await client.get("doctors/");
  return data;
};

export const adminListUsers = async () => {
  const { data } = await client.get("admin/users/");
  return data;
};

export const adminCreateUser = async (payload) => {
  const { data } = await client.post("admin/users/", payload);
  return data;
};

export const adminUpdateUser = async (userId, payload) => {
  const { data } = await client.patch(`admin/users/${userId}/`, payload);
  return data;
};

export const adminDeleteUser = async (userId) => {
  await client.delete(`admin/users/${userId}/`);
};

export const adminListPatients = async () => {
  const { data } = await client.get("admin/patients/");
  return data;
};

export const adminCreatePatient = async (payload) => {
  const { data } = await client.post("admin/patients/", payload);
  return data;
};

export const adminUpdatePatient = async (patientId, payload) => {
  const { data } = await client.patch(`admin/patients/${patientId}/`, payload);
  return data;
};

export const adminDeletePatient = async (patientId) => {
  await client.delete(`admin/patients/${patientId}/`);
};
