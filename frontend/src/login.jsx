import { useState, useEffect } from "react";
import "./styles.css";
import { useAuth } from "./context/AuthContext";
import { authAPI } from "./api/apiClient";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Login({ onBack, onSignup, onOrganizerClick, onAdminClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {

    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);


    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    try {

      let recaptchaToken = '';
      if (window.grecaptcha) {
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'login' });
      } else {
        throw new Error('reCAPTCHA is not loaded');
      }

      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed');
      }

      const response = await authAPI.login(email, password, recaptchaToken);


      if (!response.token || !response.user) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server. Token or user missing.');
      }


      if (response.user.role !== 'participant') {
        setError("This login is for participants only. Please use the appropriate login for your role.");
        setLoading(false);
        return;
      }


      login(response.token, response.user);

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {onBack && (
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
      )}
      <div className="login-card">
        <h2 className="title">Felicity</h2>
        <p className="Participant-badge">Participant Login</p>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          {error && <p className="error-message">{error}</p>}
        </form>

        <p className="signup">
          Don't have an account? <span onClick={onSignup} style={{ cursor: "pointer" }}>Sign up</span>
        </p>

        <div className="other-logins">
          <button className="alt-login-btn" onClick={onOrganizerClick}>
            Organizer Login
          </button>
          <button className="alt-login-btn" onClick={onAdminClick}>
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
