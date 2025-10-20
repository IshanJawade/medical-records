import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="app-header">
      <h1>Medical Records Portal</h1>
      <nav>
        {user ? (
          <>
            {user.role === "ADMIN" && <Link to="/admin">Admin</Link>}
            {user.role === "DOCTOR" && <Link to="/patients">Patients</Link>}
            {user.role === "RECEPTIONIST" && <Link to="/register-patient">Register Patient</Link>}
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
