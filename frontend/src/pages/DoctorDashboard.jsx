import { useEffect, useState } from "react";
import { listPatients } from "../utils/authApi.js";

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await listPatients();
        setPatients(data);
      } catch (err) {
        setError(err.response?.data?.detail || "Unable to load patients");
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  if (loading) {
    return <div className="loader">Loading patient roster…</div>;
  }

  if (error) {
    return <div className="error-text">{error}</div>;
  }

  return (
    <section className="content-card">
      <h2>Your Patients</h2>
      {patients.length === 0 ? (
        <p>No patients assigned yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>DOB</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>
                  {patient.first_name} {patient.last_name}
                </td>
                <td>{patient.date_of_birth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default DoctorDashboard;
