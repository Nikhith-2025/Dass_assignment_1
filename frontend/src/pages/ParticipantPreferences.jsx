import { useEffect, useState } from 'react';
import { participantAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { INTEREST_OPTIONS } from '../constants/interests';
import '../styles/ParticipantPreferences.css';

const INTEREST_OPTIONS_LOCAL = INTEREST_OPTIONS;

function ParticipantPreferences({ onComplete, onSkip, onNext }) {
  const { user, updateUser } = useAuth();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.interests?.length) {
      setSelected(user.interests);
    }
  }, [user]);

  const toggleInterest = (interest) => {
    setSelected((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await participantAPI.updatePreferences(selected);
      updateUser({
        interests: response.user?.interests || selected
      });

      if (onNext) onNext();
    } catch (err) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {

    if (onNext) onNext();
  };

  return (
    <div className="preferences-container">
      <div className="preferences-card">
        <h1>Set your preferences</h1>
        <p className="subtitle">
          Select areas you care about so we can personalize your event feed.
        </p>

        <div className="preferences-grid">
          {INTEREST_OPTIONS_LOCAL.map((interest) => (
            <label key={interest} className="preference-item">
              <input
                type="checkbox"
                checked={selected.includes(interest)}
                onChange={() => toggleInterest(interest)}
                disabled={saving}
              />
              <span>{interest}</span>
            </label>
          ))}
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="preferences-actions">
          <button className="secondary-btn" onClick={handleSkip} disabled={saving}>
            Skip for now
          </button>
          <button className="primary-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParticipantPreferences;
