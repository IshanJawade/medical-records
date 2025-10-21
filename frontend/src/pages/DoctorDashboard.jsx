import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext.jsx";
import { listPatients, updatePatient } from "../utils/authApi.js";
import { listCases, retrieveCase, updateCase } from "../utils/caseApi.js";
import { listAppointments, updateAppointment } from "../utils/appointmentApi.js";
import { createPrescription, listPrescriptions } from "../utils/prescriptionApi.js";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("appointments");
  const [loading, setLoading] = useState(true);

  const [appointments, setAppointments] = useState([]);
  const [cases, setCases] = useState([]);
  const [patients, setPatients] = useState([]);

  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [patientDetailsOpen, setPatientDetailsOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [caseFormData, setCaseFormData] = useState({
    name: "",
    description: "",
    symptoms: "",
    details: "",
  });

  const [prescriptionForm, setPrescriptionForm] = useState({ details: "" });
  const [patientEditForm, setPatientEditForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [appointmentData, caseData, patientData] = await Promise.all([
          listAppointments(),
          listCases(),
          listPatients(),
        ]);
        setAppointments(appointmentData);
        setCases(caseData);
        setPatients(patientData);
      } catch (error) {
        console.error("Failed to load doctor dashboard", error);
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

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) => {
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      return fullName.includes(query) || patient.date_of_birth.includes(query);
    });
  }, [patients, searchQuery]);

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return cases;
    return cases.filter((caseItem) => {
      return (
        caseItem.case_number.toLowerCase().includes(query) ||
        caseItem.patient_name.toLowerCase().includes(query) ||
        (caseItem.name && caseItem.name.toLowerCase().includes(query))
      );
    });
  }, [cases, searchQuery]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((apt) => {
      return (
        apt.appointment_number.toLowerCase().includes(query) ||
        apt.patient_name.toLowerCase().includes(query) ||
        apt.case_name.toLowerCase().includes(query)
      );
    });
  }, [appointments, searchQuery]);

  const openCaseDetails = async (caseId) => {
    try {
      resetMessages();
      const caseData = await retrieveCase(caseId);
      setSelectedCase(caseData);
      setCaseFormData({
        name: caseData.name || "",
        description: caseData.description || "",
        symptoms: caseData.symptoms || "",
        details: caseData.details || "",
      });
      setPrescriptionForm({ details: "" });
      setCaseDetailsOpen(true);
    } catch (error) {
      console.error("Failed to load case", error);
      setErrorMessage("Unable to load case details.");
    }
  };

  const closeCaseDetails = () => {
    setSelectedCase(null);
    setCaseDetailsOpen(false);
    setCaseFormData({ name: "", description: "", symptoms: "", details: "" });
  };

  const openPatientDetails = (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;
    setSelectedPatient(patient);
    setPatientEditForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
    });
    setPatientDetailsOpen(true);
  };

  const closePatientDetails = () => {
    setSelectedPatient(null);
    setPatientDetailsOpen(false);
  };

  const handleCaseFormChange = (event) => {
    const { name, value } = event.target;
    setCaseFormData((current) => ({ ...current, [name]: value }));
  };

  const handlePatientEditChange = (event) => {
    const { name, value } = event.target;
    setPatientEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleUpdateCase = async (event) => {
    event.preventDefault();
    if (!selectedCase) return;
    resetMessages();
    try {
      const updated = await updateCase(selectedCase.id, caseFormData);
      setCases((current) => current.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedCase(updated);
      setStatusMessage("Case updated successfully.");
    } catch (error) {
      console.error("Failed to update case", error);
      setErrorMessage("Unable to update case.");
    }
  };

  const handleUpdatePatient = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    resetMessages();
    try {
      const updated = await updatePatient(selectedPatient.id, patientEditForm);
      setPatients((current) => current.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPatient(updated);
      setStatusMessage("Patient details updated.");
    } catch (error) {
      console.error("Failed to update patient", error);
      setErrorMessage("Unable to update patient details.");
    }
  };

  const handleCreatePrescription = async (event) => {
    event.preventDefault();
    if (!selectedCase) return;
    resetMessages();
    try {
      const payload = {
        case: selectedCase.id,
        patient: selectedCase.patient,
        details: prescriptionForm.details.trim(),
      };
      const created = await createPrescription(payload);
      setPrescriptionForm({ details: "" });
      setStatusMessage(`Prescription created successfully.`);
      const refreshed = await retrieveCase(selectedCase.id);
      setSelectedCase(refreshed);
    } catch (error) {
      console.error("Failed to create prescription", error);
      setErrorMessage("Unable to create prescription.");
    }
  };

  const handleAppointmentStatusChange = async (appointmentId, newStatus) => {
    resetMessages();
    try {
      const updated = await updateAppointment(appointmentId, { status: newStatus });
      setAppointments((current) => current.map((apt) => (apt.id === updated.id ? updated : apt)));
      setStatusMessage("Appointment status updated.");
    } catch (error) {
      console.error("Failed to update appointment", error);
      setErrorMessage("Unable to update appointment status.");
    }
  };

  if (loading) {
    return <div className="loader">Loading doctor workspace...</div>;
  }

  const stats = [
    { label: "Appointments", value: appointments.filter((apt) => apt.status === "PENDING").length, hint: "Pending" },
    { label: "Active Cases", value: cases.length, hint: "Assigned to you" },
    { label: "My Patients", value: patients.length, hint: "Under your care" },
  ];

  return (
    <div className="receptionist-dashboard">
      <header className="dashboard-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Doctor</p>
          <h1>Clinical workspace</h1>
          <p>Welcome, Dr. {user?.first_name} {user?.last_name}. Manage appointments, review cases & provide care.</p>
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

      <div className="tabs-container">
        <div className="tabs">
          <button type="button" className={`tab-btn${activeTab === "appointments" ? " active" : ""}`} onClick={() => { setActiveTab("appointments"); setSearchQuery(""); }}>Appointments</button>
          <button type="button" className={`tab-btn${activeTab === "cases" ? " active" : ""}`} onClick={() => { setActiveTab("cases"); setSearchQuery(""); }}>Cases</button>
          <button type="button" className={`tab-btn${activeTab === "patients" ? " active" : ""}`} onClick={() => { setActiveTab("patients"); setSearchQuery(""); }}>Patients</button>
        </div>
      </div>

      <div className="dashboard-content-single">
        {activeTab === "appointments" && (
          <section className="panel">
            <div className="panel-header">
              <div><h2>Appointments</h2><p className="panel-subtitle">View and manage your scheduled appointments.</p></div>
              <div className="search-field"><input type="search" className="search-input" placeholder="Search appointments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>
            <div className="table-container">
              {filteredAppointments.length === 0 ? (
                <div className="empty-state"><h3>No appointments found</h3><p>Your appointments will appear here once scheduled.</p></div>
              ) : (
                <table className="case-table">
                  <thead><tr><th scope="col">Appt #</th><th scope="col">Patient</th><th scope="col">Case</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
                  <tbody>
                    {filteredAppointments.map((apt) => (
                      <tr key={apt.id}>
                        <td>{apt.appointment_number}</td>
                        <td>{apt.patient_name}</td>
                        <td>{apt.case_name}</td>
                        <td><span className={`status-badge status-${apt.status.toLowerCase()}`}>{apt.status}</span></td>
                        <td>
                          <div className="table-actions">
                            {apt.case && <button type="button" className="btn btn-light btn-sm" onClick={() => openCaseDetails(apt.case)}>View Case</button>}
                            <button type="button" className="btn btn-light btn-sm" onClick={() => openPatientDetails(apt.patient)}>View Patient</button>
                            {apt.status === "PENDING" && <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAppointmentStatusChange(apt.id, "IN_PROGRESS")}>Start</button>}
                            {apt.status === "IN_PROGRESS" && <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAppointmentStatusChange(apt.id, "COMPLETED")}>Complete</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {activeTab === "cases" && (
          <section className="panel">
            <div className="panel-header">
              <div><h2>My Cases</h2><p className="panel-subtitle">Cases assigned to you or your patients.</p></div>
              <div className="search-field"><input type="search" className="search-input" placeholder="Search cases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>
            <div className="table-container">
              {filteredCases.length === 0 ? (
                <div className="empty-state"><h3>No cases found</h3><p>Cases assigned to you will appear here.</p></div>
              ) : (
                <table className="case-table">
                  <thead><tr><th scope="col">Case #</th><th scope="col">Name</th><th scope="col">Patient</th><th scope="col">Symptoms</th><th scope="col">Actions</th></tr></thead>
                  <tbody>
                    {filteredCases.map((caseItem) => (
                      <tr key={caseItem.id}>
                        <td>{caseItem.case_number}</td>
                        <td>{caseItem.name || "-"}</td>
                        <td>{caseItem.patient_name}</td>
                        <td><div className="text-truncate">{caseItem.symptoms || "-"}</div></td>
                        <td><button type="button" className="btn btn-primary btn-sm" onClick={() => openCaseDetails(caseItem.id)}>Open Case</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {activeTab === "patients" && (
          <section className="panel">
            <div className="panel-header">
              <div><h2>My Patients</h2><p className="panel-subtitle">Patients under your care.</p></div>
              <div className="search-field"><input type="search" className="search-input" placeholder="Search patients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>
            <div className="table-container">
              {filteredPatients.length === 0 ? (
                <div className="empty-state"><h3>No patients found</h3><p>Patients assigned to you will appear here.</p></div>
              ) : (
                <table className="case-table">
                  <thead><tr><th scope="col">Name</th><th scope="col">Date of Birth</th><th scope="col">Actions</th></tr></thead>
                  <tbody>
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.first_name} {patient.last_name}</td>
                        <td>{patient.date_of_birth}</td>
                        <td><button type="button" className="btn btn-primary btn-sm" onClick={() => openPatientDetails(patient.id)}>View Details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </div>

      {caseDetailsOpen && selectedCase && (
        <div className="modal-overlay" onClick={closeCaseDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>Case Details</h2><p className="modal-subtitle">{selectedCase.case_number}</p></div>
              <button type="button" className="btn btn-ghost" onClick={closeCaseDetails}>Close</button>
            </div>
            <div className="modal-body">
              <form className="stack-form" onSubmit={handleUpdateCase}>
                <div className="form-field">
                  <label htmlFor="case-name">Case Name</label>
                  <input id="case-name" name="name" value={caseFormData.name} onChange={handleCaseFormChange} placeholder="Enter case name" />
                </div>
                <div className="form-field">
                  <label htmlFor="case-symptoms">Symptoms</label>
                  <textarea id="case-symptoms" name="symptoms" rows="3" value={caseFormData.symptoms} onChange={handleCaseFormChange} readOnly />
                  <small>Symptoms recorded by reception (read-only)</small>
                </div>
                <div className="form-field">
                  <label htmlFor="case-description">Description</label>
                  <textarea id="case-description" name="description" rows="3" value={caseFormData.description} onChange={handleCaseFormChange} />
                </div>
                <div className="form-field">
                  <label htmlFor="case-details">Clinical Details</label>
                  <textarea id="case-details" name="details" rows="5" value={caseFormData.details} onChange={handleCaseFormChange} placeholder="Add detailed notes, diagnosis, treatment plan..." />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Update Case</button>
                </div>
              </form>

              <div className="modal-section">
                <h3>Write Prescription</h3>
                <form className="stack-form" onSubmit={handleCreatePrescription}>
                  <div className="form-field">
                    <label htmlFor="prescription-details">Prescription Details</label>
                    <textarea id="prescription-details" rows="4" value={prescriptionForm.details} onChange={(e) => setPrescriptionForm({ details: e.target.value })} placeholder="Medication name, dosage, duration, instructions..." required />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Create Prescription</button>
                  </div>
                </form>
              </div>

              {selectedCase.prescriptions && selectedCase.prescriptions.length > 0 && (
                <div className="modal-section">
                  <h3>Existing Prescriptions</h3>
                  <ul className="prescription-list">
                    {selectedCase.prescriptions.map((rx) => (
                      <li key={rx.id} className="prescription-item">
                        <strong>{rx.prescription_number}</strong>
                        <p>{rx.details}</p>
                        <small>Created: {new Date(rx.created_at).toLocaleString()}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="case-metadata">
                <p><strong>Patient:</strong> {selectedCase.patient_name}</p>
                <p><strong>Created:</strong> {new Date(selectedCase.created_at).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> {new Date(selectedCase.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {patientDetailsOpen && selectedPatient && (
        <div className="modal-overlay" onClick={closePatientDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>Patient Details</h2><p className="modal-subtitle">{selectedPatient.first_name} {selectedPatient.last_name}</p></div>
              <button type="button" className="btn btn-ghost" onClick={closePatientDetails}>Close</button>
            </div>
            <div className="modal-body">
              <form className="stack-form" onSubmit={handleUpdatePatient}>
                <div className="form-field">
                  <label htmlFor="patient-first-name">First Name</label>
                  <input id="patient-first-name" name="first_name" value={patientEditForm.first_name} onChange={handlePatientEditChange} required />
                </div>
                <div className="form-field">
                  <label htmlFor="patient-last-name">Last Name</label>
                  <input id="patient-last-name" name="last_name" value={patientEditForm.last_name} onChange={handlePatientEditChange} required />
                </div>
                <div className="form-field">
                  <label htmlFor="patient-dob">Date of Birth</label>
                  <input id="patient-dob" name="date_of_birth" type="date" value={patientEditForm.date_of_birth} onChange={handlePatientEditChange} required />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Update Patient</button>
                </div>
              </form>
              <div className="case-metadata">
                <p><strong>Patient ID:</strong> {selectedPatient.id}</p>
                <p><strong>Registered:</strong> {new Date(selectedPatient.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
