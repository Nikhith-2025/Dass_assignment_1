import { useEffect, useState } from 'react';
import { eventAPI } from '../api/apiClient';
import '../styles/OngoingEvents.css';

function OngoingEvents({ onBack, onCreate, onAttendance }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getOrganizerEvents();
      const list = Array.isArray(response) ? response : response.events || [];
      setEvents(list.filter((event) => event.status === 'ONGOING'));
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId, status) => {
    try {
      setUpdatingId(eventId);
      setError('');
      const response = await eventAPI.updateEvent(eventId, { status });
      const updated = response?.event || response;
      setEvents((prev) =>
        prev
          .map((eventItem) => (eventItem._id === eventId ? { ...eventItem, ...updated } : eventItem))
          .filter((eventItem) => eventItem.status === 'ONGOING')
      );
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="ongoing-events-loading">Loading...</div>;
  }

  return (
    <div className="ongoing-events-container">
      <div className="ongoing-events-card">
        <div className="header">
          <div>
            <h1>Ongoing Events</h1>
            <p>Track events currently in progress.</p>
          </div>
          <div className="header-actions">
            <button className="secondary-btn" onClick={onBack}>Back to Dashboard</button>
            <button className="primary-btn" onClick={onCreate}>Create Event</button>
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        {events.length === 0 ? (
          <div className="empty-state">No ongoing events yet.</div>
        ) : (
          <div className="events-list">
            {events.map((event) => (
              <div key={event._id} className="event-item">
                <div>
                  <h3>{event.name}</h3>
                  <p>{event.description}</p>
                  <p className="meta">
                    {new Date(event.startDate).toLocaleString()} - {new Date(event.endDate).toLocaleString()}
                  </p>
                </div>
                <div className="status-actions">
                  <span className="status">ONGOING</span>
                  <button
                    className="primary-btn"
                    style={{ background: 'linear-gradient(135deg, #d9683a, #c05030)', fontSize: '13px' }}
                    onClick={() => onAttendance && onAttendance(event._id)}
                  >
                    Scan Attendance
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => handleStatusChange(event._id, 'COMPLETED')}
                    disabled={updatingId === event._id}
                  >
                    Mark Completed
                  </button>
                  <button
                    className="danger-btn"
                    onClick={() => handleStatusChange(event._id, 'CLOSED')}
                    disabled={updatingId === event._id}
                  >
                    Close Event
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OngoingEvents;

