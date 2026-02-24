import React, { useState, useEffect } from 'react';
import { participantAPI, eventAPI } from '../api/apiClient';
import '../styles/OrganizerProfile.css';

const OrganizerDetail = ({ organizerId, onBack, onEventClick }) => {
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isFollowing, setIsFollowing] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    fetchOrganizerData();
  }, [organizerId]);

  const fetchOrganizerData = async () => {
    try {
      setLoading(true);


      const allOrganizers = await participantAPI.getAllOrganizers();
      const organizersList = Array.isArray(allOrganizers) ? allOrganizers : allOrganizers.organizers || [];
      const foundOrganizer = organizersList.find(org => org._id === organizerId);

      if (foundOrganizer) {
        setOrganizer(foundOrganizer);


        try {
          const eventsResponse = await eventAPI.getOrganizerPublicEvents(organizerId);
          const eventsList = Array.isArray(eventsResponse) ? eventsResponse : eventsResponse.events || [];
          setEvents(eventsList);
        } catch (err) {
          console.error('Error fetching organizer events:', err);
          setEvents([]);
        }


        const followedClubsResponse = await participantAPI.getFollowedClubs();
        const followedClubs = Array.isArray(followedClubsResponse)
          ? followedClubsResponse
          : followedClubsResponse.followedClubs || [];
        const followedIds = followedClubs.map(c => typeof c === 'string' ? c : c._id);
        setIsFollowing(followedIds.includes(organizerId));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching organizer data:', error);
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      setFollowing(true);
      await participantAPI.followOrganizer(organizerId);
      setIsFollowing(true);
    } catch (error) {
      console.error('Error following organizer:', error);
    } finally {
      setFollowing(false);
    }
  };

  const handleUnfollow = async () => {
    try {
      setFollowing(true);
      await participantAPI.unfollowOrganizer(organizerId);
      setIsFollowing(false);
    } catch (error) {
      console.error('Error unfollowing organizer:', error);
    } finally {
      setFollowing(false);
    }
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events.filter(event => new Date(event.startDate) > now);
  };

  const getPastEvents = () => {
    const now = new Date();
    return events.filter(event => new Date(event.startDate) <= now);
  };

  const getDisplayEvents = () => {
    if (activeTab === 'upcoming') {
      return getUpcomingEvents();
    }
    return getPastEvents();
  };

  if (loading) {
    return (
      <div className="organizer-profile-container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>Loading organizer...</p>
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="organizer-profile-container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p>Organizer not found</p>
      </div>
    );
  }

  const displayEvents = getDisplayEvents();

  return (
    <div className="organizer-profile-container">
      <button className="back-btn" onClick={onBack}>← Back to Clubs</button>

      <div className="organizer-profile-card view-mode">
        <div className="organizer-header">
          <div className="organizer-info">
            <h1>{organizer.organizerName}</h1>
            <p className="category">{organizer.category}</p>
            <p className="description">{organizer.description}</p>
            <div className="contact-info">
              <span>{organizer.contactEmail}</span>
            </div>
          </div>

          <button
            className={`follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={isFollowing ? handleUnfollow : handleFollow}
            disabled={following}
          >
            {following ? 'Processing...' : (isFollowing ? 'Following' : 'Follow')}
          </button>
        </div>

        <div className="events-section">
          <h2>Events by {organizer.organizerName}</h2>

          <div className="event-tabs">
            <button
              className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming ({getUpcomingEvents().length})
            </button>
            <button
              className={`tab ${activeTab === 'past' ? 'active' : ''}`}
              onClick={() => setActiveTab('past')}
            >
              Past ({getPastEvents().length})
            </button>
          </div>

          {displayEvents.length === 0 ? (
            <p className="no-events">No {activeTab} events yet</p>
          ) : (
            <div className="events-list">
              {displayEvents.map((event) => (
                <div key={event._id} className="event-card-container">
                  <div className="event-card">
                    <div className="event-card-header">
                      <div className="event-header-left">
                        <h3 className="event-name">{event.name}</h3>
                        <span className={`event-type-badge ${event.type.toLowerCase()}`}>{event.type}</span>
                      </div>
                    </div>

                    <p className="event-description">{event.description}</p>

                    <div className="event-details-grid">
                      <div className="detail-box">
                        <span className="detail-label">📅 Date</span>
                        <span className="detail-value">
                          {new Date(event.startDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="detail-box">
                        <span className="detail-label">⏰ Time</span>
                        <span className="detail-value">
                          {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="detail-box">
                        <span className="detail-label">👥 Registrations</span>
                        <span className="detail-value">
                          {event.registrationCount || 0} / {event.registrationLimit}
                        </span>
                      </div>

                      {event.registrationFee > 0 && (
                        <div className="detail-box">
                          <span className="detail-label">💰 Fee</span>
                          <span className="detail-value">₹{event.registrationFee}</span>
                        </div>
                      )}

                      {event.venue && (
                        <div className="detail-box">
                          <span className="detail-label">📍 Venue</span>
                          <span className="detail-value">{event.venue}</span>
                        </div>
                      )}

                      {event.isOnline && (
                        <div className="detail-box">
                          <span className="detail-label">🌐 Mode</span>
                          <span className="detail-value">Online</span>
                        </div>
                      )}
                    </div>

                    <div className="event-card-footer">
                      <button
                        className="view-details-btn"
                        onClick={() => onEventClick && onEventClick(event._id)}
                      >
                        View Details & Register →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDetail;
