import { useEffect, useState } from "react";
import {
  adminCreatePatient,
  adminCreateUser,
  adminDeletePatient,
  adminDeleteUser,
  adminListPatients,
  adminListUsers,
  listDoctors,
} from "../utils/authApi.js";

const initialUserForm = {
  username: "",
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "DOCTOR",
  specialty: "",
  license_number: "",
  desk_number: "",
};

const initialPatientForm = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  symptoms: "",
  attending_doctor: "",
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [userData, patientData, doctorData] = await Promise.all([
          adminListUsers(),
          adminListPatients(),
          listDoctors(),
        ]);
        setUsers(userData);
        setPatients(patientData);
        setDoctors(doctorData);
      } catch (error) {
        console.error("Admin bootstrap failed", error);
        setStatusMessage("Unable to load admin data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const handleUserChange = (event) => {
    const { name, value } = event.target;
    setUserForm((current) => ({ ...current, [name]: value }));
  };

  const handlePatientChange = (event) => {
    const { name, value } = event.target;
    setPatientForm((current) => ({ ...current, [name]: value }));
  };

  const submitUser = async (event) => {
    event.preventDefault();
    setStatusMessage(null);
    try {
      const created = await adminCreateUser(userForm);
      setUsers((current) => [...current, created]);
      setUserForm(initialUserForm);
      setStatusMessage("User created successfully.");
    } catch (error) {
      const detail = error.response?.data;
      setStatusMessage(typeof detail === "string" ? detail : "Unable to create user.");
    }
  };

  const submitPatient = async (event) => {
    event.preventDefault();
    setStatusMessage(null);
    try {
      const { symptoms, ...patientPayload } = patientForm;
      const payload = {
        ...patientPayload,
        attending_doctor: Number(patientForm.attending_doctor),
      };
      const created = await adminCreatePatient(payload);
      setPatients((current) => [...current, created]);
      setPatientForm(initialPatientForm);
      setStatusMessage("Patient created successfully.");
    } catch (error) {
      const detail = error.response?.data;
      setStatusMessage(typeof detail === "string" ? detail : "Unable to create patient.");
    }
  };

  const deleteUser = async (userId) => {
    try {
      await adminDeleteUser(userId);
      setUsers((current) => current.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("User deletion failed", error);
      setStatusMessage("Failed to delete user.");
    }
  };

  const deletePatient = async (patientId) => {
    try {
      await adminDeletePatient(patientId);
      setPatients((current) => current.filter((patient) => patient.id !== patientId));
    } catch (error) {
      console.error("Patient deletion failed", error);
      setStatusMessage("Failed to delete patient.");
    }
  };

  if (loading) {
    return <div className="loader">Loading admin console…</div>;
  }

  const isDoctorRole = userForm.role === "DOCTOR";

  return (
    <section className="admin-grid">
      <div className="content-card">
        <h2>Manage Staff Accounts</h2>
        <form className="admin-form" onSubmit={submitUser}>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" value={userForm.username} onChange={handleUserChange} required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={userForm.email} onChange={handleUserChange} />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={userForm.password}
            onChange={handleUserChange}
            required
          />

          <label htmlFor="first_name">First Name</label>
          <input id="first_name" name="first_name" value={userForm.first_name} onChange={handleUserChange} />

          <label htmlFor="last_name">Last Name</label>
          <input id="last_name" name="last_name" value={userForm.last_name} onChange={handleUserChange} />

          <label htmlFor="role">Role</label>
          <select id="role" name="role" value={userForm.role} onChange={handleUserChange}>
            <option value="ADMIN">Admin</option>
            <option value="DOCTOR">Doctor</option>
            <option value="RECEPTIONIST">Receptionist</option>
          </select>

          {isDoctorRole ? (
            <>
              <label htmlFor="specialty">Specialty</label>
              <input id="specialty" name="specialty" value={userForm.specialty} onChange={handleUserChange} />

              <label htmlFor="license_number">License Number</label>
              <input
                id="license_number"
                name="license_number"
                value={userForm.license_number}
                onChange={handleUserChange}
                required
              />
            </>
          ) : (
            <>
              <label htmlFor="desk_number">Desk Number</label>
              <input id="desk_number" name="desk_number" value={userForm.desk_number} onChange={handleUserChange} />
            </>
          )}

          <button type="submit">Create User</button>
        </form>

        <div className="list-container">
          <h3>Current Staff</h3>
          {users.length === 0 ? (
            <p>No staff members registered.</p>
          ) : (
            <ul className="item-list">
              {users.map((user) => (
                <li key={user.id}>
                  <div>
                    <strong>{user.username}</strong> — {user.role}
                  </div>
                  <button type="button" onClick={() => deleteUser(user.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="content-card">
        <h2>Manage Patient Records</h2>
        <form className="admin-form" onSubmit={submitPatient}>
          <label htmlFor="patient-first-name">First Name</label>
          <input
            id="patient-first-name"
            name="first_name"
            value={patientForm.first_name}
            onChange={handlePatientChange}
            required
          />

          <label htmlFor="patient-last-name">Last Name</label>
          <input
            id="patient-last-name"
            name="last_name"
            value={patientForm.last_name}
            onChange={handlePatientChange}
            required
          />

          <label htmlFor="patient-dob">Date of Birth</label>
          <input
            id="patient-dob"
            name="date_of_birth"
            type="date"
            value={patientForm.date_of_birth}
            onChange={handlePatientChange}
            required
          />

          <label htmlFor="patient-symptoms">Symptoms</label>
          <textarea
            id="patient-symptoms"
            name="symptoms"
            rows="4"
            value={patientForm.symptoms}
            onChange={handlePatientChange}
          />

          <label htmlFor="patient-doctor">Attending Doctor</label>
          <select
            id="patient-doctor"
            name="attending_doctor"
            value={patientForm.attending_doctor}
            onChange={handlePatientChange}
            required
          >
            <option value="">Assign doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.user.first_name && doctor.user.last_name
                  ? `${doctor.user.first_name} ${doctor.user.last_name}`
                  : doctor.user.username}
              </option>
            ))}
          </select>

          <button type="submit">Create Patient</button>
        </form>

        <div className="list-container">
          <h3>All Patients</h3>
          {patients.length === 0 ? (
            <p>No patient records available.</p>
          ) : (
            <ul className="item-list">
              {patients.map((patient) => (
                <li key={patient.id}>
                  <div>
                    <strong>
                      {patient.first_name} {patient.last_name}
                    </strong>
                    <span> — DOB: {patient.date_of_birth}</span>
                  </div>
                  <button type="button" onClick={() => deletePatient(patient.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {statusMessage && <p className="status-text">{statusMessage}</p>}
    </section>
  );
};

export default AdminDashboard;
