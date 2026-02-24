import React, { useState, useEffect } from 'react';
import { eventAPI, participantAPI } from '../api/apiClient';
import '../styles/BrowseEvents.css';

const BrowseEvents = ({ onBack, onEventClick }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [followedClubIds, setFollowedClubIds] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    eligibility: 'all',
    dateRange: 'upcoming',
    followedOnly: false,
    sort: 'recommended'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchFollowedClubs();
  }, []);

  const fetchFollowedClubs = async () => {
    try {
      const followedResponse = await participantAPI.getFollowedClubs();
      const followedList = Array.isArray(followedResponse)
        ? followedResponse
        : (followedResponse.followedClubs || followedResponse.followedOrganizers || []);
      const followedIds = followedList.map(club => {
        return typeof club === 'string' ? club : club._id;
      });
      setFollowedClubIds(followedIds);
    } catch (error) {
      console.error('Error fetching followed clubs:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const response = await eventAPI.browseEvents({ sort: 'recommended' });
      const list = Array.isArray(response) ? response : response.events || [];
      setEvents(list);
      setFilteredEvents(list);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (filters.sort) {
      fetchEventsWithSort();
    }
  }, [filters.sort]);

  const fetchEventsWithSort = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.browseEvents({ sort: filters.sort });
      const list = Array.isArray(response) ? response : response.events || [];
      setEvents(list);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterEvents();
  }, [searchTerm, filters, events, followedClubIds]);

  const filterEvents = () => {
    let filtered = [...events];


    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.name?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.organizer?.organizerName?.toLowerCase().includes(searchLower)
      );
    }


    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(event => event.type === filters.type);
    }


    if (filters.eligibility && filters.eligibility !== 'all') {
      filtered = filtered.filter(event => event.eligibility === filters.eligibility);
    }


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filters.dateRange === 'upcoming') {
      filtered = filtered.filter(event => {
        const startDate = new Date(event.startDate);
        return startDate >= today;
      });
    } else if (filters.dateRange === 'ongoing') {
      filtered = filtered.filter(event => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        return start <= today && today <= end;
      });
    } else if (filters.dateRange === 'all') {

    }


    if (filters.followedOnly && followedClubIds.length > 0) {
      filtered = filtered.filter(event =>
        event.organizer?._id && followedClubIds.includes(event.organizer._id)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  return (
    <div className="browse-events-container">
      <nav className="browse-nav">
        <div className="nav-actions">
          <button className="nav-item" onClick={onBack}>← Back</button>
        </div>
        <div className="nav-brand">Felicity</div>
      </nav>
      <div className="events-header">
        <h1>Browse Events</h1>
        <p>Discover events and register now</p>
      </div>

      <div className="events-content">
        {/* Filters Sidebar */}
        <div className="filters-sidebar">
          <div className="filter-group">
            <h3>Search</h3>
            <input
              type="text"
              placeholder="Search events/clubs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <h3>Event Type</h3>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="NORMAL">Normal Event</option>
              <option value="MERCHANDISE">Merchandise</option>
            </select>
          </div>

          <div className="filter-group">
            <h3>Eligibility</h3>
            <select
              value={filters.eligibility}
              onChange={(e) => handleFilterChange('eligibility', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Users</option>
              <option value="IIIT">IIIT Only</option>
              <option value="Non-IIIT">Non-IIIT</option>
              <option value="Everyone">Everyone</option>
            </select>
          </div>

          <div className="filter-group">
            <h3>When</h3>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming Events</option>
              <option value="ongoing">Ongoing Events</option>
            </select>
          </div>

          <div className="filter-group">
            <h3>Sort By</h3>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="filter-select"
            >
              <option value="recommended">Recommended</option>
              <option value="trending">Trending</option>
              <option value="newest">Newest</option>
              <option value="upcoming">Upcoming First</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.followedOnly}
                onChange={(e) => handleFilterChange('followedOnly', e.target.checked)}
              />
              <span>Followed Clubs Only</span>
            </label>
          </div>
        </div>

        {/* Events Grid */}
        <div className="events-grid">
          {loading ? (
            <div className="loading">Loading events...</div>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <div key={event._id} className="event-card">
                <div className="event-header">
                  <h3>{event.name}</h3>
                  <span className={`event-type ${event.type}`}>{event.type}</span>
                </div>
                <div className="event-details">
                  <p className="organizer">{event.organizer?.organizerName}</p>
                  <p className="description">{event.description?.substring(0, 100)}...</p>
                  <div className="event-meta">
                    <span>{new Date(event.startDate).toLocaleDateString()}</span>
                    <span>{event.eligibility}</span>
                  </div>
                </div>
                <button className="register-btn" onClick={() => onEventClick(event._id)}>View Details</button>
              </div>
            ))
          ) : (
            <div className="no-events">No events found matching your criteria</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseEvents;
