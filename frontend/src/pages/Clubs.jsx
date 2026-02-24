import React, { useState, useEffect } from 'react';
import { participantAPI } from '../api/apiClient';
import '../styles/Clubs.css';

const Clubs = ({ onBack, onOrganizerClick }) => {
  const [clubs, setClubs] = useState([]);
  const [followedClubIds, setFollowedClubIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [following, setFollowing] = useState({});

  useEffect(() => {
    loadClubsData();
  }, []);

  const loadClubsData = async () => {
    try {
      setLoading(true);

      const clubsResponse = await participantAPI.getAllOrganizers();
      const clubsList = Array.isArray(clubsResponse) ? clubsResponse : clubsResponse.organizers || [];
      setClubs(clubsList);


      const followedResponse = await participantAPI.getFollowedClubs();

      const followedList = Array.isArray(followedResponse)
        ? followedResponse
        : (followedResponse.followedClubs || followedResponse.followedOrganizers || []);


      const followedIds = followedList.map(club => {

        return typeof club === 'string' ? club : club._id;
      });
      setFollowedClubIds(followedIds);
    } catch (error) {
      console.error('Error loading clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (organizerId) => {
    try {
      setFollowing(prev => ({ ...prev, [organizerId]: true }));
      await participantAPI.followOrganizer(organizerId);

      setFollowedClubIds(prev => [...prev, organizerId]);
      setFollowing(prev => ({ ...prev, [organizerId]: false }));
    } catch (error) {
      console.error('Error following club:', error);

      setFollowedClubIds(prev => prev.filter(id => id !== organizerId));
      setFollowing(prev => ({ ...prev, [organizerId]: false }));
    }
  };

  const handleUnfollow = async (organizerId) => {
    try {
      setFollowing(prev => ({ ...prev, [organizerId]: true }));
      await participantAPI.unfollowOrganizer(organizerId);

      setFollowedClubIds(prev => prev.filter(id => id !== organizerId));
      setFollowing(prev => ({ ...prev, [organizerId]: false }));
    } catch (error) {
      console.error('Error unfollowing club:', error);

      setFollowedClubIds(prev => [...prev, organizerId]);
      setFollowing(prev => ({ ...prev, [organizerId]: false }));
    }
  };

  const filteredClubs = clubs.filter(club =>
    club.organizerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="clubs-container">
      <nav className="clubs-nav">
        <div className="nav-actions"><button className="nav-item" onClick={onBack}>← Back</button></div>
        <div className="nav-brand">Felicity</div>
      </nav>
      <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>Loading clubs...</p>
    </div>
  );

  return (
    <div className="clubs-container">
      <nav className="clubs-nav">
        <div className="nav-actions">
          <button className="nav-item" onClick={onBack}>← Back</button>
        </div>
        <div className="nav-brand">Felicity</div>
      </nav>

      <div className="clubs-content">
        <div className="clubs-header">
          <h1>Explore Clubs</h1>
          <p>Follow your favorite clubs to get notified about their events</p>
        </div>

        <div className="clubs-search">
          <input
            type="text"
            placeholder="Search clubs/organizers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="clubs-grid">
          {filteredClubs.length > 0 ? (
            filteredClubs.map(club => (
              <div key={club._id} className="club-card">
                <div className="club-header">
                  <h3>{club.organizerName}</h3>
                  <span className="club-category">{club.category}</span>
                </div>
                <p className="club-description">{club.description}</p>
                <div className="club-contact">
                  <span>Email: {club.contactEmail}</span>
                </div>
                <div className="club-actions">
                  <button
                    className="details-btn"
                    onClick={() => onOrganizerClick && onOrganizerClick(club._id)}
                  >
                    View Details
                  </button>
                  <button
                    className={`follow-btn ${followedClubIds.includes(club._id) ? 'following' : ''}`}
                    onClick={() => {
                      if (followedClubIds.includes(club._id)) {
                        handleUnfollow(club._id);
                      } else {
                        handleFollow(club._id);
                      }
                    }}
                    disabled={following[club._id]}
                  >
                    {following[club._id] ? 'Loading...' : (followedClubIds.includes(club._id) ? 'Following' : 'Follow')}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-clubs">No clubs/organizers found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clubs;
