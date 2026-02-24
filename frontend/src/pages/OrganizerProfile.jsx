import { useEffect, useState } from 'react';
import { organizerAPI } from '../api/apiClient';
import '../styles/OrganizerProfile.css';

const CATEGORY_OPTIONS = [
  { value: 'CLUB', label: 'Club' },
  { value: 'COUNCIL', label: 'Council' },
  { value: 'FEST_TEAM', label: 'Fest Team' }
];

function OrganizerProfile({ onBack }) {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    organizerName: '',
    category: 'CLUB',
    description: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhookUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await organizerAPI.getProfile();
      const organizerProfile = response?.organizer || response;
      setProfile(organizerProfile);
      setFormData({
        organizerName: organizerProfile?.organizerName || '',
        category: organizerProfile?.category || 'CLUB',
        description: organizerProfile?.description || '',
        contactEmail: organizerProfile?.contactEmail || '',
        contactNumber: organizerProfile?.contactNumber || '',
        discordWebhookUrl: organizerProfile?.discordWebhookUrl || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await organizerAPI.updateProfile(formData);
      const organizerProfile = response?.organizer || response;
      setProfile(organizerProfile);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="organizer-profile-container">
        <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="organizer-profile-container">
      <div className="organizer-profile-card">
        <div className="header">
          <div>
            <h1>Organizer Profile</h1>
            <p>Update your club details and contact information.</p>
          </div>
          <button className="secondary-btn" onClick={onBack}>Back to Dashboard</button>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="form-grid">
          <div className="form-group">
            <label>Organizer Name</label>
            <input
              type="text"
              name="organizerName"
              value={formData.organizerName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Login Email (non-editable)</label>
            <input
              type="email"
              value={profile?.user?.email || profile?.email || ''}
              disabled
              style={{ backgroundColor: '#070707ff', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select name="category" value={formData.category} onChange={handleChange}>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Contact Email</label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group full-width">
            <label>Discord Webhook URL</label>
            <input
              type="url"
              name="discordWebhookUrl"
              value={formData.discordWebhookUrl}
              onChange={handleChange}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#ccc' }}>Security Settings</h3>
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>
            Need to reset your password? Submit a request to the admin.
          </p>
          <button
            className="secondary-btn"
            style={{ background: 'transparent', border: '1px solid #d9683a', color: '#d9683a' }}
            onClick={async () => {
              const reason = prompt('Why do you need a password reset?');
              if (!reason) return;
              try {
                await organizerAPI.requestPasswordReset(reason);
                alert('Password reset request submitted! The admin will review it.');
              } catch (err) {
                alert(err.message || 'Failed to submit request');
              }
            }}
          >
            Request Password Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrganizerProfile;
