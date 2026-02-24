import { useEffect, useState } from 'react';
import { participantAPI } from '../api/apiClient';
import '../styles/FollowOrganizers.css';

function FollowOrganizers({ onComplete, onSkip }) {
  const [organizers, setOrganizers] = useState([]);
  const [followedIds, setFollowedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      const [organizersResponse, followedResponse] = await Promise.all([
        participantAPI.getAllOrganizers(),
        participantAPI.getFollowedClubs()
      ]);

      const organizersList = Array.isArray(organizersResponse)
        ? organizersResponse
        : organizersResponse.organizers || [];

      const followedList = Array.isArray(followedResponse)
        ? followedResponse
        : (followedResponse.followedClubs || []);

      const followedIdsList = followedList.map(club =>
        typeof club === 'string' ? club : club._id
      );

      setOrganizers(organizersList);
      setFollowedIds(followedIdsList);
    } catch (err) {
      setError(err.message || 'Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (organizerId) => {
    const isFollowing = followedIds.includes(organizerId);

    try {
      if (isFollowing) {
        setFollowedIds(prev => prev.filter(id => id !== organizerId));
        await participantAPI.unfollowOrganizer(organizerId);
      } else {
        setFollowedIds(prev => [...prev, organizerId]);
        await participantAPI.followOrganizer(organizerId);
      }
    } catch (err) {
      if (isFollowing) {
        setFollowedIds(prev => [...prev, organizerId]);
      } else {
        setFollowedIds(prev => prev.filter(id => id !== organizerId));
      }
      setError(err.message || 'Failed to update following status');
    }
  };

  const handleContinue = () => {
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    if (onSkip) onSkip();
  };

  const filteredOrganizers = organizers.filter(org =>
    org.organizerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category) => {
    const colors = {
      'CLUB': '#6366f1',
      'COUNCIL': '#f59e0b',
      'FEST_TEAM': '#10b981'
    };
    return colors[category] || '#d9683a';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="fo-container">
        <div className="fo-content">
          <p style={{ color: '#999', textAlign: 'center', padding: '80px 0', fontSize: '16px' }}>
            Loading clubs & organizers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fo-container">
      <div className="fo-content">
        {/* Header */}
        <div className="fo-header">
          <div className="fo-step-indicator">
            <span className="fo-step completed">1</span>
            <span className="fo-step-line"></span>
            <span className="fo-step active">2</span>
          </div>
          <h1 className="fo-title">Follow Clubs & Organizers</h1>
          <p className="fo-subtitle">
            Follow your favorite clubs to get personalized event recommendations and notifications
          </p>
        </div>

        {/* Search */}
        <div className="fo-search-wrapper">
          <span className="fo-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search clubs by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fo-search-input"
          />
        </div>

        {error && <div className="fo-error">{error}</div>}

        {/* Stats bar */}
        <div className="fo-stats-bar">
          <span>{filteredOrganizers.length} club{filteredOrganizers.length !== 1 ? 's' : ''} available</span>
          <span className="fo-following-count">
            {followedIds.length > 0 && (
              <>{followedIds.length} following</>
            )}
          </span>
        </div>

        {/* Cards Grid */}
        <div className="fo-grid">
          {filteredOrganizers.map((org) => {
            const isFollowing = followedIds.includes(org._id);
            const catColor = getCategoryColor(org.category);
            return (
              <div
                key={org._id}
                className={`fo-card ${isFollowing ? 'fo-card-following' : ''}`}
              >
                <div className="fo-card-top">
                  <div
                    className="fo-avatar"
                    style={{ background: `linear-gradient(135deg, ${catColor}, ${catColor}88)` }}
                  >
                    {getInitials(org.organizerName)}
                  </div>
                  <div className="fo-card-info">
                    <h3 className="fo-card-name">{org.organizerName}</h3>
                    <span className="fo-card-category" style={{ color: catColor }}>
                      {org.category?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {org.description && (
                  <p className="fo-card-desc">
                    {org.description.substring(0, 80)}
                    {org.description.length > 80 ? '...' : ''}
                  </p>
                )}

                <button
                  className={`fo-follow-btn ${isFollowing ? 'fo-following' : ''}`}
                  onClick={() => toggleFollow(org._id)}
                  disabled={saving}
                >
                  {isFollowing ? (
                    <><span className="fo-check">●</span> Following</>
                  ) : (
                    <>+ Follow</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {filteredOrganizers.length === 0 && (
          <div className="fo-empty">
            <p>No clubs found matching "{searchTerm}"</p>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="fo-bottom">
          <div className="fo-actions">
            <button className="fo-skip-btn" onClick={handleSkip} disabled={saving}>
              Skip for now
            </button>
            <button className="fo-continue-btn" onClick={handleContinue} disabled={saving}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FollowOrganizers;
