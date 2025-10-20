import { useEffect, useState } from "react";
import { createPatient, listDoctors } from "../utils/authApi.js";

const defaultForm = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  medical_history: "",
  attending_doctor: "",
};

const ReceptionistDashboard = () => {
  const [form, setForm] = useState(defaultForm);
  const [doctors, setDoctors] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await listDoctors();
        setDoctors(data);
      } catch (error) {
        setStatusMessage("Unable to load doctors; please retry after refreshing.");
      }
    };
    fetchDoctors();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await createPatient({
        ...form,
        attending_doctor: Number(form.attending_doctor),
      });
      setForm(defaultForm);
      setStatusMessage("Patient created successfully.");
    } catch (error) {
      const detail = error.response?.data;
      setStatusMessage(typeof detail === "string" ? detail : "Creation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="content-card">
      <h2>Register New Patient</h2>
      <form onSubmit={handleSubmit} className="patient-form">
        <label htmlFor="first_name">First Name</label>
        <input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />

        <label htmlFor="last_name">Last Name</label>
        <input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />

        <label htmlFor="date_of_birth">Date of Birth</label>
        <input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          value={form.date_of_birth}
          onChange={handleChange}
          required
        />

        <label htmlFor="medical_history">Medical History</label>
        <textarea
          id="medical_history"
          name="medical_history"
          rows="4"
          value={form.medical_history}
          onChange={handleChange}
        />

        <label htmlFor="attending_doctor">Attending Doctor</label>
        <select
          id="attending_doctor"
          name="attending_doctor"
          value={form.attending_doctor}
          onChange={handleChange}
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

        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Create Patient"}
        </button>
      </form>
      {statusMessage && <p className="status-text">{statusMessage}</p>}
    </section>
  );
};

export default ReceptionistDashboard;
