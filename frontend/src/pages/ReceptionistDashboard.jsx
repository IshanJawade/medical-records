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

  const resetCaseFormState = () => {
    setCaseForm(defaultCaseForm);
    setSelectedPatientId("");
    setCasePatientQuery("");
  };

  const openCaseForm = () => {
    resetMessages();
    if (!showCaseForm) {
      resetCaseFormState();
    }
    setShowCaseForm(true);
  };

  const closeCaseForm = () => {
    resetCaseFormState();
    setShowCaseForm(false);
  };

  const openPatientForm = () => {
    resetMessages();
    setPatientForm(defaultPatientForm);
    setEditPatientId(null);
    setEditPatientForm(defaultPatientForm);
    setShowPatientForm(true);
  };

  const closePatientForm = () => {
    setPatientForm(defaultPatientForm);
    setShowPatientForm(false);
  };

  const closeEditForm = () => {
    setEditPatientId(null);
    setEditPatientForm(defaultPatientForm);
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

  const stats = useMemo(
    () => [
      {
        label: "Active cases",
        value: cases.length,
        hint: "Cases awaiting doctor intake.",
      },
      {
        label: "Registered patients",
        value: patients.length,
        hint: "Profiles created by your desk.",
      },
      {
        label: "Available doctors",
        value: doctors.length,
        hint: "Doctors ready for assignments.",
      },
    ],
    [cases.length, patients.length, doctors.length],
  );

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
      closeCaseForm();
      setStatusMessage(`Case ${created.case_number} created.`);
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
      closePatientForm();
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
    setShowPatientForm(false);
    setPatientForm(defaultPatientForm);
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
      closeEditForm();
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
    <div className="receptionist-dashboard">
      <header className="dashboard-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Reception</p>
          <h1>Patient intake &amp; case routing</h1>
          <p>Capture symptoms quickly, keep doctors informed, and guide patients through their visit.</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-light" onClick={openPatientForm}>
            + Register patient
          </button>
          <button type="button" className="btn btn-primary" onClick={openCaseForm}>
            + New case
          </button>
        </div>
      </header>

      <div className="stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
            <span className="stat-hint">{stat.hint}</span>
          </article>
        ))}
      </div>

      {(statusMessage || errorMessage) && (
        <div className="message-stack">
          {statusMessage && <div className="message-banner message-banner--success">{statusMessage}</div>}
          {errorMessage && <div className="message-banner message-banner--error">{errorMessage}</div>}
        </div>
      )}

      <div className="dashboard-content">
        <div className="dashboard-main">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Case overview</h2>
                <p className="panel-subtitle">Stay on top of every new intake from the front desk.</p>
              </div>
              <div className="panel-actions">
                <div className="search-field">
                  <label className="sr-only" htmlFor="case-search">
                    Search cases
                  </label>
                  <input
                    id="case-search"
                    type="search"
                    className="search-input"
                    placeholder="Search by case, patient, or doctor"
                    value={caseSearch}
                    onChange={(event) => setCaseSearch(event.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-primary" onClick={openCaseForm}>
                  + New case
                </button>
              </div>
            </div>
            <div className="table-container">
              {filteredCases.length === 0 ? (
                <div className="empty-state">
                  <h3>No cases match your search</h3>
                  <p>Use the new case action to capture symptoms for a patient.</p>
                </div>
              ) : (
                <table className="case-table">
                  <thead>
                    <tr>
                      <th scope="col">Case #</th>
                      <th scope="col">Patient</th>
                      <th scope="col">Assigned doctor(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((caseItem) => (
                      <tr key={caseItem.id}>
                        <td>{caseItem.case_number}</td>
                        <td>{caseItem.patient_name}</td>
                        <td>{caseItem.assigned_doctor_names.join(", ") || "Not assigned"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {showCaseForm && (
            <section className="panel accent-panel">
              <div className="panel-header">
                <div>
                  <h2>Initialise case</h2>
                  <p className="panel-subtitle">Select a patient and log their symptoms for the doctor.</p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={closeCaseForm}>
                  Close
                </button>
              </div>
              <form className="stack-form" onSubmit={handleCaseSubmit}>
                <div className="form-field">
                  <label htmlFor="case-patient-search">Find patient</label>
                  <input
                    id="case-patient-search"
                    type="search"
                    className="search-input"
                    placeholder="Search by patient name"
                    value={casePatientQuery}
                    onChange={(event) => setCasePatientQuery(event.target.value)}
                  />
                </div>
                <ul className="suggestion-list">
                  {casePatientMatches.map((patient) => (
                    <li key={patient.id}>
                      <button type="button" onClick={() => selectPatientForCase(patient.id)}>
                        {patient.first_name} {patient.last_name} (DOB {patient.date_of_birth})
                      </button>
                    </li>
                  ))}
                  {casePatientMatches.length === 0 && <li className="empty-pill">No patients found.</li>}
                </ul>

                {selectedPatient && (
                  <div className="selected-card">
                    <p>
                      <strong>Selected:</strong> {selectedPatient.first_name} {selectedPatient.last_name} (DOB {" "}
                      {selectedPatient.date_of_birth})
                    </p>
                    <div className="selected-actions">
                      <button type="button" className="btn btn-light" onClick={() => beginEditPatient(selectedPatient.id)}>
                        Edit patient
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setSelectedPatientId("")}>
                        Clear selection
                      </button>
                    </div>
                  </div>
                )}

                <button type="button" className="btn btn-light" onClick={openPatientForm}>
                  + Register new patient
                </button>

                <div className="form-field">
                  <label htmlFor="case-symptoms">Symptoms</label>
                  <textarea
                    id="case-symptoms"
                    name="symptoms"
                    rows="4"
                    value={caseForm.symptoms}
                    onChange={handleCaseFormChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="case-description">Additional details</label>
                  <textarea
                    id="case-description"
                    name="description"
                    rows="3"
                    value={caseForm.description}
                    onChange={handleCaseFormChange}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={caseSubmitting}>
                    {caseSubmitting ? "Creating..." : "Create case"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        <aside className="dashboard-aside">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Patient directory</h2>
                <p className="panel-subtitle">Search, select, or edit patient details.</p>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="patient-search">Search patients</label>
              <input
                id="patient-search"
                type="search"
                className="search-input"
                placeholder="Search by name or birth date"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
              />
            </div>
            {patientDirectoryMatches.length === 0 ? (
              <div className="empty-state">
                <h3>No patients match your search</h3>
                <p>Register a new patient to start their intake.</p>
              </div>
            ) : (
              <ul className="directory-list">
                {patientDirectoryMatches.map((patient) => {
                  const isSelected = String(patient.id) === String(selectedPatientId);
                  return (
                    <li key={patient.id} className={`directory-item${isSelected ? " is-selected" : ""}`}>
                      <div className="directory-meta">
                        <span className="directory-name">
                          {patient.first_name} {patient.last_name}
                        </span>
                        <span className="directory-sub">DOB {patient.date_of_birth}</span>
                      </div>
                      <div className="directory-actions">
                        <button type="button" className="btn btn-light" onClick={() => selectPatientForCase(patient.id)}>
                          Use for case
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => beginEditPatient(patient.id)}>
                          Edit
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {showPatientForm && (
            <section className="panel accent-panel">
              <div className="panel-header">
                <div>
                  <h2>Register patient</h2>
                  <p className="panel-subtitle">Create a patient profile and assign their primary doctor.</p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={closePatientForm}>
                  Close
                </button>
              </div>
              <form className="stack-form" onSubmit={handlePatientSubmit}>
                <div className="form-field">
                  <label htmlFor="new-patient-first">First name</label>
                  <input
                    id="new-patient-first"
                    name="first_name"
                    value={patientForm.first_name}
                    onChange={handlePatientFormChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="new-patient-last">Last name</label>
                  <input
                    id="new-patient-last"
                    name="last_name"
                    value={patientForm.last_name}
                    onChange={handlePatientFormChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="new-patient-dob">Date of birth</label>
                  <input
                    id="new-patient-dob"
                    name="date_of_birth"
                    type="date"
                    value={patientForm.date_of_birth}
                    onChange={handlePatientFormChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="new-patient-doctor">Attending doctor</label>
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
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={closePatientForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={patientSubmitting}>
                    {patientSubmitting ? "Saving..." : "Save patient"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {editPatientId && (
            <section className="panel accent-panel">
              <div className="panel-header">
                <div>
                  <h2>Edit patient</h2>
                  <p className="panel-subtitle">Update patient details and doctor assignments.</p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={closeEditForm}>
                  Close
                </button>
              </div>
              <form className="stack-form" onSubmit={handleEditPatientSubmit}>
                <div className="form-field">
                  <label htmlFor="edit-patient-first">First name</label>
                  <input
                    id="edit-patient-first"
                    name="first_name"
                    value={editPatientForm.first_name}
                    onChange={handleEditPatientChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-patient-last">Last name</label>
                  <input
                    id="edit-patient-last"
                    name="last_name"
                    value={editPatientForm.last_name}
                    onChange={handleEditPatientChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-patient-dob">Date of birth</label>
                  <input
                    id="edit-patient-dob"
                    name="date_of_birth"
                    type="date"
                    value={editPatientForm.date_of_birth}
                    onChange={handleEditPatientChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-patient-doctor">Attending doctor</label>
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
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={closeEditForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                    {editSubmitting ? "Updating..." : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
