// src/auth/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../firebase/authService";
import "../styles/login.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin(email, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-seal">
        <img 
          src="../public/assets/police.png" 
          alt="Police Department Seal" 
          style={{ width: "48px", height: "48px", objectFit: "contain" }} 
        />
      </div>

          <h1>Certificate Admin</h1>
          <p>Only for authorized personnel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field-group">
            <label htmlFor="email">Admin Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@certificate.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="btn-spinner" />
            ) : (
              "Sign In to Admin Panel"
            )}
          </button>
        </form>

        <p className="login-footer">
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
