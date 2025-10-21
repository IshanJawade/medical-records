// Application level shape helpers for case records.

export const buildEmptyCase = () => ({
  id: null,
  case_number: "",
  name: "",
  description: "",
  details: "",
  patient: null,
  created_by: null,
  assigned_doctors: [],
  attachments: [],
  prescriptions: [],
  created_at: null,
  updated_at: null,
});

export const normalizeCase = (apiCase = {}) => ({
  id: apiCase.id ?? null,
  case_number: apiCase.case_number ?? "",
  name: apiCase.name ?? "",
  description: apiCase.description ?? "",
  details: apiCase.details ?? "",
  patient: apiCase.patient ?? null,
  created_by: apiCase.created_by ?? null,
  assigned_doctors: apiCase.assigned_doctors ?? [],
  attachments: apiCase.attachments ?? [],
  prescriptions: apiCase.prescriptions ?? [],
  created_at: apiCase.created_at ?? null,
  updated_at: apiCase.updated_at ?? null,
});
