import client from "../api/client.js";

export const listCases = async (params = {}) => {
  const { data } = await client.get("cases/", { params });
  return data;
};

export const retrieveCase = async (caseId) => {
  const { data } = await client.get(`cases/${caseId}/`);
  return data;
};

export const createCase = async (payload) => {
  const { data } = await client.post("cases/", payload);
  return data;
};

export const updateCase = async (caseId, payload) => {
  const { data } = await client.patch(`cases/${caseId}/`, payload);
  return data;
};

export const deleteCase = async (caseId) => {
  await client.delete(`cases/${caseId}/`);
};
