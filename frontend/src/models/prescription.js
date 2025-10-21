// Application level shape helpers for prescription records.

export const buildEmptyPrescription = () => ({
  id: null,
  prescription_number: "",
  case: null,
  doctor: null,
  patient: null,
  details: "",
  attachments: [],
  created_at: null,
  updated_at: null,
});

export const normalizePrescription = (apiPrescription = {}) => ({
  id: apiPrescription.id ?? null,
  prescription_number: apiPrescription.prescription_number ?? "",
  case: apiPrescription.case ?? null,
  doctor: apiPrescription.doctor ?? null,
  patient: apiPrescription.patient ?? null,
  details: apiPrescription.details ?? "",
  attachments: apiPrescription.attachments ?? [],
  created_at: apiPrescription.created_at ?? null,
  updated_at: apiPrescription.updated_at ?? null,
});
