import './landing.css'

function Landing({ onLoginClick, onSignupClick }) {
  return (
    <div className="landing-container">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <nav className="landing-nav">
        <div className="nav-brand">
          <span className="brand-text">Felicity</span>
        </div>
        <div className="nav-buttons">
          <button className="nav-btn" onClick={onLoginClick}>
            Login
          </button>
          <button className="nav-btn primary" onClick={onSignupClick}>
            Sign Up
          </button>
        </div>
      </nav>

      <div className="landing-content">
        <div className="hero-section">
          <h1 className="hero-title">Welcome to Felicity</h1>
          <p className="hero-subtitle">IIIT Hyderabad's Annual Cultural Fest</p>
          <p className="hero-description">
            Felicity is IIIT Hyderabad’s largest and most vibrant annual fest, bringing together students from across the country for a celebration of culture, creativity, and community. Known for its eclectic mix of cultural performances, competitions, workshops, and flagship events, Felicity transforms the campus into a hub of energy and expression.
          </p>
        </div>

        <div className="cta-section">
          <button className="cta-btn primary-btn" onClick={onSignupClick}>
            Get Started
          </button>
          <button className="cta-btn secondary-btn" onClick={onLoginClick}>
            Already have an account? Login
          </button>
        </div>
      </div>

      <footer className="landing-footer">
        <p>© Nikhith Reddy K - IIIT Hyderabad. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Landing
