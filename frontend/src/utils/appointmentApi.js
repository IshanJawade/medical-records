import client from "../api/client.js";

export const listAppointments = async (params = {}) => {
  const { data } = await client.get("appointments/", { params });
  return data;
};

export const retrieveAppointment = async (appointmentId) => {
  const { data } = await client.get(`appointments/${appointmentId}/`);
  return data;
};

export const createAppointment = async (payload) => {
  const { data } = await client.post("appointments/", payload);
  return data;
};

export const updateAppointment = async (appointmentId, payload) => {
  const { data } = await client.patch(`appointments/${appointmentId}/`, payload);
  return data;
};

export const deleteAppointment = async (appointmentId) => {
  await client.delete(`appointments/${appointmentId}/`);
};
