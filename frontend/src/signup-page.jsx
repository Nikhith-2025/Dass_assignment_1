import { useState, useEffect } from "react";
import "./styles.css";
import { authAPI } from "./api/apiClient";
import { useAuth } from "./context/AuthContext";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Signup({ onBack }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    college: "IIIT Hyderabad",
    password: "",
    confirmPassword: "",
    phone: "",
    isIIIT: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
      if (error) setError('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);


    if (!formData.firstName.trim()) {
      setError("First name is required");
      setLoading(false);
      return;
    }
    if (!formData.lastName.trim()) {
      setError("Last name is required");
      setLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }
    if (!formData.college.trim()) {
      setError("College is required");
      setLoading(false);
      return;
    }
    if (!formData.password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      setLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      setError("Phone number must be exactly 10 digits");
      setLoading(false);
      return;
    }

    try {

      let recaptchaToken = '';
      if (window.grecaptcha) {
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'signup' });
      } else {
        throw new Error('reCAPTCHA is not loaded');
      }

      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed');
      }

      const signupData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        collegeOrganizationName: formData.college,
        password: formData.password,
        contactNumber: formData.phone,
        participantType: formData.isIIIT ? 'IIIT' : 'Non-IIIT',
        role: 'participant',
        recaptchaToken,
      };

      const response = await authAPI.signup(signupData);


      if (!response.token || !response.user) {
        throw new Error('Invalid response from server');
      }


      login(response.token, response.user);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack}>
        Back
      </button>

      <div className="signup-card">
        <h2 className="title">Create Account</h2>
        <p className="subtitle">Join Felicity as a participant</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="example@gmail.com"
            value={formData.email}
            onChange={handleChange}
          />

          <div className="form-group option-group" style={{ marginTop: "12px" }}>
            <span className="option-label">Participant Type</span>

            <label className="option-item">
              <input
                type="radio"
                name="participantType"
                checked={formData.isIIIT}
                onChange={() => {
                  setFormData((prev) => ({
                    ...prev,
                    isIIIT: true,
                    college: "IIIT Hyderabad",
                  }));
                  if (error) setError("");
                }}
              />
              <span>IIIT participant</span>
            </label>

            <label className="option-item">
              <input
                type="radio"
                name="participantType"
                checked={!formData.isIIIT}
                onChange={() => {
                  setFormData((prev) => ({
                    ...prev,
                    isIIIT: false,
                    college: "",
                  }));
                  if (error) setError("");
                }}
              />
              <span>Non‑IIIT participant</span>
            </label>
          </div>

          <label>College</label>
          <input
            type="text"
            name="college"
            placeholder="e.g., IIIT Hyderabad"
            value={formData.college}
            onChange={handleChange}
            disabled={formData.isIIIT}
          />

          <label>Phone Number</label>
          <input
            type="tel"
            name="phone"
            placeholder="9876543210"
            value={formData.phone}
            onChange={handleChange}
            maxLength={10}
            pattern="[0-9]{10}"
          />

          <label>Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
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

          <label>Confirm Password</label>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">Account created! Redirecting to dashboard...</p>}

          <button type="submit" className="login-btn" disabled={loading || success}>
            {loading ? "Creating Account..." : success ? "Redirecting..." : "Create Account"}
          </button>
        </form>

        <p className="signup">
          Already have an account?{" "}
          <span onClick={onBack} style={{ cursor: "pointer" }}>
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}
