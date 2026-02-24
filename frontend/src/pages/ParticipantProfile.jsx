import React, { useState, useEffect } from 'react';
import { participantAPI } from '../api/apiClient';
import { INTEREST_OPTIONS } from '../constants/interests';
import '../styles/ParticipantProfile.css';

const ParticipantProfile = ({ onBack }) => {
  const [profile, setProfile] = useState(null);
  const [interests, setInterests] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    collegeOrganizationName: '',
    interests: []
  });
  const [loading, setLoading] = useState(true);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await participantAPI.getProfile();
      setProfile(response);
      setFormData({
        firstName: response.firstName,
        lastName: response.lastName,
        contactNumber: response.contactNumber,
        collegeOrganizationName: response.collegeOrganizationName,
        interests: response.interests || []
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }


    try {
      const followedResponse = await participantAPI.getFollowedClubs();
      const list = Array.isArray(followedResponse)
        ? followedResponse
        : (followedResponse.followedClubs || followedResponse.followedOrganizers || []);
      setFollowedClubs(list);
    } catch (error) {
      console.error('Error fetching followed clubs:', error);
    }

    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleInterestToggle = (interest) => {
    setFormData({
      ...formData,
      interests: formData.interests.includes(interest)
        ? formData.interests.filter(i => i !== interest)
        : [...formData.interests, interest]
    });
  };

  const handleSaveProfile = async () => {
    try {
      const response = await participantAPI.updateProfile(formData);

      const userData = response.user || response;
      const updatedProfile = {
        ...userData,
        email: profile.email,
        participantType: profile.participantType
      };
      setProfile(updatedProfile);
      setFormData({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        contactNumber: updatedProfile.contactNumber,
        collegeOrganizationName: updatedProfile.collegeOrganizationName,
        interests: updatedProfile.interests || []
      });
      setEditMode(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile');
    }
  };

  if (loading) return (
    <div className="participant-profile-container">
      <nav className="profile-nav">
        <div className="nav-actions"><button className="nav-item" onClick={onBack}>← Back</button></div>
        <div className="nav-brand">Felicity</div>
      </nav>
      <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>Loading profile...</p>
    </div>
  );

  return (
    <div className="participant-profile-container">
      <nav className="profile-nav">
        <div className="nav-actions">
          <button className="nav-item" onClick={onBack}>← Back</button>
        </div>
        <div className="nav-brand">Felicity</div>
      </nav>

      <div className="profile-content-wrapper">
        <div className="profile-header">
          <h1>My Profile</h1>
          <button
            className="edit-btn"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="profile-content">
          <section className="profile-section">
            <h2>Personal Information</h2>

            {editMode ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>College/Organization Name</label>
                  <input
                    type="text"
                    name="collegeOrganizationName"
                    value={formData.collegeOrganizationName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            ) : (
              <div className="profile-info">
                <div className="info-item">
                  <span className="label">Name:</span>
                  <span className="value">{profile.firstName} {profile.lastName}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email:</span>
                  <span className="value">{profile.email}</span>
                </div>
                <div className="info-item">
                  <span className="label">Contact:</span>
                  <span className="value">{profile.contactNumber || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <span className="label">College/Org:</span>
                  <span className="value">{profile.collegeOrganizationName || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Participant Type:</span>
                  <span className="value">{profile.participantType === 'IIIT' ? 'IIIT Student' : 'Non-IIIT Participant'}</span>
                </div>
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2>Your Interests</h2>
            {editMode ? (
              <div className="interests-edit">
                <p className="interests-hint">Select your interests to personalize your event recommendations</p>
                <div className="interests-grid">
                  {INTEREST_OPTIONS.map(interest => (
                    <label key={interest} className="interest-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.interests.includes(interest)}
                        onChange={() => handleInterestToggle(interest)}
                      />
                      <span>{interest}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="interests-display">
                {profile.interests && profile.interests.length > 0 ? (
                  <div className="interests-tags">
                    {profile.interests.map(interest => (
                      <span key={interest} className="interest-tag">{interest}</span>
                    ))}
                  </div>
                ) : (
                  <p className="no-interests">No interests selected yet</p>
                )}
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2>Followed Clubs</h2>
            {followedClubs.length > 0 ? (
              <div className="interests-tags">
                {followedClubs.map(club => (
                  <span key={club._id || club} className="interest-tag">
                    {club.organizerName || club}
                  </span>
                ))}
              </div>
            ) : (
              <p className="no-interests">Not following any clubs yet</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Security Settings</h2>
            <div className="edit-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>
              {passwordError && <p style={{ color: '#f44336', margin: '8px 0' }}>{passwordError}</p>}
              {passwordSuccess && <p style={{ color: '#4caf50', margin: '8px 0' }}>{passwordSuccess}</p>}
              <button
                className="save-btn"
                onClick={async () => {
                  setPasswordError('');
                  setPasswordSuccess('');
                  if (!passwordData.currentPassword || !passwordData.newPassword) {
                    setPasswordError('Both fields are required');
                    return;
                  }
                  if (passwordData.newPassword.length < 6) {
                    setPasswordError('New password must be at least 6 characters');
                    return;
                  }
                  if (passwordData.newPassword !== passwordData.confirmPassword) {
                    setPasswordError('Passwords do not match');
                    return;
                  }
                  try {
                    await participantAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
                    setPasswordSuccess('Password changed successfully!');
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  } catch (err) {
                    setPasswordError(err.message || 'Failed to change password');
                  }
                }}
              >
                Change Password
              </button>
            </div>
          </section>

          {editMode && (
            <div className="profile-actions">
              <button className="save-btn" onClick={handleSaveProfile}>
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantProfile;
