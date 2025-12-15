import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { BACKEND_URL } from "../config";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect") || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // ✅ strict email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    try {
      const res = await axios.post(`${BACKEND_URL}/login`, {
        email,
        password,
      });

      if (res.data && res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onLogin(res.data.user);
        navigate(redirect, { replace: true });
      } else {
        setError("Login failed");
      }
    } catch (err) {
      const msg = err.response?.data?.error;

      if (msg === "User not found") {
        setError(
          <>
            User not found.{" "}
            <Link
              to="/register"
              style={{ color: "#1a73e8", textDecoration: "underline" }}
            >
              Register now
            </Link>
          </>
        );
      } else if (msg === "Incorrect password") {
        setError(
          <>
            Incorrect password.{" "}
            <Link
              to={`/reset-password?email=${email}`}
              style={{ color: "#1a73e8", textDecoration: "underline" }}
            >
              Forgot password?
            </Link>
          </>
        );
      } else {
        setError("Login failed. Try again.");
      }
    }
  };

  return (
    <div
      className="auth-container"
      style={{ maxWidth: "400px", margin: "auto", padding: "30px" }}
    >
      <h2 style={{ textAlign: "center" }}>Login</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        <button
          type="submit"
          style={{
            padding: "12px",
            backgroundColor: "#1a73e8",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </form>

      {/* ✅ Register link always visible */}
      <p style={{ textAlign: "center", marginTop: "15px" }}>
        New user?{" "}
        <Link to="/register" style={{ color: "#1a73e8" }}>
          Register here
        </Link>
      </p>

      {error && (
        <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Login;
