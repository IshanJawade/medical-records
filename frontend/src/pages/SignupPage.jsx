import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const initialForm = {
  username: "",
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "RECEPTIONIST",
  specialty: "",
  license_number: "",
  desk_number: "",
};

const SignupPage = () => {
  const { signup } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(form);
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data;
      setError(typeof detail === "string" ? detail : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isDoctor = form.role === "DOCTOR";

  return (
    <section className="auth-card">
      <h2>Create Staff Account</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" value={form.username} onChange={handleChange} required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <label htmlFor="first_name">First Name</label>
        <input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} />

        <label htmlFor="last_name">Last Name</label>
        <input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} />

        <label htmlFor="role">Role</label>
        <select id="role" name="role" value={form.role} onChange={handleChange}>
          <option value="DOCTOR">Doctor</option>
          <option value="RECEPTIONIST">Receptionist</option>
        </select>

        {isDoctor ? (
          <>
            <label htmlFor="specialty">Specialty</label>
            <input id="specialty" name="specialty" value={form.specialty} onChange={handleChange} />

            <label htmlFor="license_number">License Number</label>
            <input
              id="license_number"
              name="license_number"
              value={form.license_number}
              onChange={handleChange}
              required
            />
          </>
        ) : (
          <>
            <label htmlFor="desk_number">Desk Number</label>
            <input id="desk_number" name="desk_number" value={form.desk_number} onChange={handleChange} />
          </>
        )}

        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Sign Up"}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </section>
  );
};

export default SignupPage;
