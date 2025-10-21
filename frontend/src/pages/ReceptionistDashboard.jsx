import { useEffect, useMemo, useState } from "react";
import { createPatient, listDoctors, listPatients, updatePatient } from "../utils/authApi.js";
import { createCase, listCases } from "../utils/caseApi.js";

const defaultPatientForm = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  attending_doctor: "",
};

const defaultCaseForm = {
  symptoms: "",
  description: "",
};

const ReceptionistDashboard = () => {
  const [cases, setCases] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [caseSearch, setCaseSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [casePatientQuery, setCasePatientQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [caseForm, setCaseForm] = useState(defaultCaseForm);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientForm, setPatientForm] = useState(defaultPatientForm);
  const [editPatientId, setEditPatientId] = useState(null);
  const [editPatientForm, setEditPatientForm] = useState(defaultPatientForm);

  const [caseSubmitting, setCaseSubmitting] = useState(false);
  const [patientSubmitting, setPatientSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [caseData, patientData, doctorData] = await Promise.all([
          listCases(),
          listPatients(),
          listDoctors(),
        ]);
        setCases(caseData);
        setPatients(patientData);
        setDoctors(doctorData);
      } catch (error) {
        console.error("Failed to load receptionist dashboard", error);
        setErrorMessage("Unable to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const resetMessages = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const toggleCaseForm = () => {
    setShowCaseForm((value) => {
      const next = !value;
      if (!next) {
        setCaseForm(defaultCaseForm);
        setSelectedPatientId("");
        setCasePatientQuery("");
      }
      return next;
    });
    resetMessages();
  };

  const casePatientMatches = useMemo(() => {
    const query = casePatientQuery.trim().toLowerCase();
    if (!query) {
      return patients.slice(0, 5);
    }
    return patients
      .filter((patient) => `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [casePatientQuery, patients]);

  const filteredCases = useMemo(() => {
    const query = caseSearch.trim().toLowerCase();
    if (!query) {
      return cases;
    }
    return cases.filter((item) => {
      const doctorNames = item.assigned_doctor_names.join(" ").toLowerCase();
      return (
        item.case_number.toLowerCase().includes(query) ||
        item.patient_name.toLowerCase().includes(query) ||
        doctorNames.includes(query)
      );
    });
  }, [caseSearch, cases]);

  const patientDirectoryMatches = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) {
      return patients;
    }
    return patients.filter((patient) => {
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      return fullName.includes(query) || patient.date_of_birth.includes(query);
    });
  }, [patientSearch, patients]);

  const selectedPatient = selectedPatientId
    ? patients.find((patient) => String(patient.id) === String(selectedPatientId))
    : null;

  const handleCaseFormChange = (event) => {
    const { name, value } = event.target;
    setCaseForm((current) => ({ ...current, [name]: value }));
  };

  const handlePatientFormChange = (event) => {
    const { name, value } = event.target;
    setPatientForm((current) => ({ ...current, [name]: value }));
  };

  const handleEditPatientChange = (event) => {
    const { name, value } = event.target;
    setEditPatientForm((current) => ({ ...current, [name]: value }));
  };

  const selectPatientForCase = (patientId) => {
    setSelectedPatientId(String(patientId));
    setCasePatientQuery("");
    resetMessages();
  };

  const handleCaseSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPatientId) {
      setErrorMessage("Please select a patient before creating a case.");
      return;
    }
    resetMessages();
    setCaseSubmitting(true);
    try {
      const payload = {
        patient: Number(selectedPatientId),
        symptoms: caseForm.symptoms.trim(),
      };
      if (caseForm.description.trim()) {
        payload.description = caseForm.description.trim();
      }
      const created = await createCase(payload);
      setCases((current) => [created, ...current]);
      setCaseForm(defaultCaseForm);
      setSelectedPatientId("");
      setStatusMessage(`Case ${created.case_number} created.`);
      setShowCaseForm(false);
    } catch (error) {
      console.error("Case creation failed", error);
      const detail = error.response?.data;
      setErrorMessage(typeof detail === "string" ? detail : "Unable to create case.");
    } finally {
      setCaseSubmitting(false);
    }
  };

  const handlePatientSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    setPatientSubmitting(true);
    try {
      const payload = {
        ...patientForm,
        attending_doctor: Number(patientForm.attending_doctor),
      };
      const created = await createPatient(payload);
      setPatients((current) => [...current, created]);
      setPatientForm(defaultPatientForm);
      setShowPatientForm(false);
      setSelectedPatientId(String(created.id));
      setStatusMessage("Patient registered and selected for the case.");
    } catch (error) {
      console.error("Patient creation failed", error);
      const detail = error.response?.data;
      setErrorMessage(typeof detail === "string" ? detail : "Unable to register patient.");
    } finally {
      setPatientSubmitting(false);
    }
  };

  const beginEditPatient = (patientId) => {
    const patient = patients.find((item) => item.id === patientId);
    if (!patient) {
      return;
    }
    setEditPatientId(patientId);
    setEditPatientForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
      attending_doctor: patient.attending_doctor ? String(patient.attending_doctor) : "",
    });
    resetMessages();
  };

  const handleEditPatientSubmit = async (event) => {
    event.preventDefault();
    if (!editPatientId) {
      return;
    }
    resetMessages();
    setEditSubmitting(true);
    try {
      const payload = {
        ...editPatientForm,
        attending_doctor: Number(editPatientForm.attending_doctor),
      };
      const updated = await updatePatient(editPatientId, payload);
      setPatients((current) => current.map((patient) => (patient.id === updated.id ? updated : patient)));
      setCases((current) =>
        current.map((caseItem) =>
          caseItem.patient === updated.id
            ? {
                ...caseItem,
                patient_name: `${updated.first_name} ${updated.last_name}`.trim(),
              }
            : caseItem,
        ),
      );
      setEditPatientId(null);
      setStatusMessage("Patient details updated.");
    } catch (error) {
      console.error("Patient update failed", error);
      const detail = error.response?.data;
      setErrorMessage(typeof detail === "string" ? detail : "Unable to update patient details.");
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loader">Loading receptionist tools...</div>;
  }

  return (
    <div className="dashboard-grid">
      {statusMessage && <p className="status-text">{statusMessage}</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <section className="content-card">
        <div className="card-header">
          <h2>Cases</h2>
          <button type="button" onClick={toggleCaseForm}>
            {showCaseForm ? "Close" : "New Case"}
          </button>
        </div>
        <input
          type="search"
          placeholder="Search cases by number, patient, or doctor"
          value={caseSearch}
          onChange={(event) => setCaseSearch(event.target.value)}
        />
        {filteredCases.length === 0 ? (
          <p>No cases match your search.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Case #</th>
                <th>Patient</th>
                <th>Assigned Doctor(s)</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((caseItem) => (
                <tr key={caseItem.id}>
                  <td>{caseItem.case_number}</td>
                  <td>{caseItem.patient_name}</td>
                  <td>{caseItem.assigned_doctor_names.join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showCaseForm && (
        <section className="content-card">
          <h2>Initialise Case</h2>
          <form className="case-form" onSubmit={handleCaseSubmit}>
            <label htmlFor="case-patient-search">Find Patient</label>
            <input
              id="case-patient-search"
              type="search"
              placeholder="Search by patient name"
              value={casePatientQuery}
              onChange={(event) => setCasePatientQuery(event.target.value)}
            />
            <ul className="search-results">
              {casePatientMatches.map((patient) => (
                <li key={patient.id}>
                  <button type="button" onClick={() => selectPatientForCase(patient.id)}>
                    {patient.first_name} {patient.last_name} (DOB {patient.date_of_birth})
                  </button>
                </li>
              ))}
              {casePatientMatches.length === 0 && <li>No patients found.</li>}
            </ul>

            {selectedPatient && (
              <div className="selected-patient">
                <p>
                  <strong>Selected:</strong> {selectedPatient.first_name} {selectedPatient.last_name} (DOB {" "}
                  {selectedPatient.date_of_birth})
                </p>
                <div className="selected-actions">
                  <button type="button" onClick={() => beginEditPatient(selectedPatient.id)}>
                    Edit patient details
                  </button>
                  <button type="button" onClick={() => setSelectedPatientId("")}>
                    Clear selection
                  </button>
                </div>
              </div>
            )}

            <button type="button" onClick={() => setShowPatientForm(true)}>
              Register new patient
            </button>

            <label htmlFor="case-symptoms">Symptoms</label>
            <textarea
              id="case-symptoms"
              name="symptoms"
              rows="4"
              value={caseForm.symptoms}
              onChange={handleCaseFormChange}
              required
            />

            <label htmlFor="case-description">Additional Details</label>
            <textarea
              id="case-description"
              name="description"
              rows="3"
              value={caseForm.description}
              onChange={handleCaseFormChange}
            />

            <button type="submit" disabled={caseSubmitting}>
              {caseSubmitting ? "Creating..." : "Create Case"}
            </button>
          </form>
        </section>
      )}

      {showPatientForm && (
        <section className="content-card">
          <h2>Register Patient</h2>
          <form className="patient-form" onSubmit={handlePatientSubmit}>
            <label htmlFor="new-patient-first">First Name</label>
            <input
              id="new-patient-first"
              name="first_name"
              value={patientForm.first_name}
              onChange={handlePatientFormChange}
              required
            />

            <label htmlFor="new-patient-last">Last Name</label>
            <input
              id="new-patient-last"
              name="last_name"
              value={patientForm.last_name}
              onChange={handlePatientFormChange}
              required
            />

            <label htmlFor="new-patient-dob">Date of Birth</label>
            <input
              id="new-patient-dob"
              name="date_of_birth"
              type="date"
              value={patientForm.date_of_birth}
              onChange={handlePatientFormChange}
              required
            />

            <label htmlFor="new-patient-doctor">Attending Doctor</label>
            <select
              id="new-patient-doctor"
              name="attending_doctor"
              value={patientForm.attending_doctor}
              onChange={handlePatientFormChange}
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.first_name && doctor.user.last_name
                    ? `${doctor.user.first_name} ${doctor.user.last_name}`
                    : doctor.user.username}
                </option>
              ))}
            </select>

            <div className="form-actions">
              <button type="button" onClick={() => setShowPatientForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={patientSubmitting}>
                {patientSubmitting ? "Saving..." : "Save Patient"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="content-card">
        <h2>Patient Directory</h2>
        <input
          type="search"
          placeholder="Search patients"
          value={patientSearch}
          onChange={(event) => setPatientSearch(event.target.value)}
        />
        {patientDirectoryMatches.length === 0 ? (
          <p>No patients match your search.</p>
        ) : (
          <ul className="item-list">
            {patientDirectoryMatches.map((patient) => (
              <li key={patient.id}>
                <div>
                  <strong>
                    {patient.first_name} {patient.last_name}
                  </strong>
                  <span> DOB {patient.date_of_birth}</span>
                </div>
                <div className="item-actions">
                  <button type="button" onClick={() => selectPatientForCase(patient.id)}>
                    Use for case
                  </button>
                  <button type="button" onClick={() => beginEditPatient(patient.id)}>
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editPatientId && (
        <section className="content-card">
          <h2>Edit Patient</h2>
          <form className="patient-form" onSubmit={handleEditPatientSubmit}>
            <label htmlFor="edit-patient-first">First Name</label>
            <input
              id="edit-patient-first"
              name="first_name"
              value={editPatientForm.first_name}
              onChange={handleEditPatientChange}
              required
            />

            <label htmlFor="edit-patient-last">Last Name</label>
            <input
              id="edit-patient-last"
              name="last_name"
              value={editPatientForm.last_name}
              onChange={handleEditPatientChange}
              required
            />

            <label htmlFor="edit-patient-dob">Date of Birth</label>
            <input
              id="edit-patient-dob"
              name="date_of_birth"
              type="date"
              value={editPatientForm.date_of_birth}
              onChange={handleEditPatientChange}
              required
            />

            <label htmlFor="edit-patient-doctor">Attending Doctor</label>
            <select
              id="edit-patient-doctor"
              name="attending_doctor"
              value={editPatientForm.attending_doctor}
              onChange={handleEditPatientChange}
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.first_name && doctor.user.last_name
                    ? `${doctor.user.first_name} ${doctor.user.last_name}`
                    : doctor.user.username}
                </option>
              ))}
            </select>

            <div className="form-actions">
              <button type="button" onClick={() => setEditPatientId(null)}>
                Cancel
              </button>
              <button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
