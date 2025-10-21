import client from "../api/client.js";

export const listPrescriptions = async (params = {}) => {
  const { data } = await client.get("prescriptions/", { params });
  return data;
};

export const retrievePrescription = async (prescriptionId) => {
  const { data } = await client.get(`prescriptions/${prescriptionId}/`);
  return data;
};

export const createPrescription = async (payload) => {
  const { data } = await client.post("prescriptions/", payload);
  return data;
};

export const updatePrescription = async (prescriptionId, payload) => {
  const { data } = await client.patch(`prescriptions/${prescriptionId}/`, payload);
  return data;
};

export const deletePrescription = async (prescriptionId) => {
  await client.delete(`prescriptions/${prescriptionId}/`);
};
