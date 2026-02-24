import { useState, useEffect } from 'react';
import '../styles/OrganizerDashboard.css';
import { organizerAPI, eventAPI, registrationAPI } from '../api/apiClient';

function OrganizerDashboard({ onNavigate, onEventClick }) {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [viewingParticipants, setViewingParticipants] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [proofViewUrl, setProofViewUrl] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const profileResponse = await organizerAPI.getProfile();
      const organizerProfile = profileResponse?.organizer || profileResponse;

      setProfile({
        organizerName: organizerProfile?.organizerName || 'Organizer',
        category: organizerProfile?.category || 'CLUB',
        contactEmail: organizerProfile?.contactEmail || ''
      });


      const eventsResponse = await eventAPI.getOrganizerEvents();
      const eventsList = Array.isArray(eventsResponse) ? eventsResponse : eventsResponse.events || [];
      setEvents(eventsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const userData = JSON.parse(localStorage.getItem('user'));
      setProfile({ organizerName: userData?.organizerName || 'Organizer', category: 'CLUB', contactEmail: userData?.email || '' });
      setEvents([]);
      setLoading(false);
    }
  };

  const handlePublishEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to publish this event? Once published, editing will be limited.')) {
      return;
    }

    try {
      setPublishing(prev => ({ ...prev, [eventId]: true }));
      await eventAPI.publishEvent(eventId);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error publishing event:', error);
      alert('Failed to publish event: ' + error.message);
    } finally {
      setPublishing(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setEditFormData({
      name: event.name || '',
      description: event.description || '',
      eligibility: event.eligibility || 'ALL',
      venue: event.venue || '',
      startDate: event.startDate?.split('T')[0] || '',
      endDate: event.endDate?.split('T')[0] || '',
      registrationDeadline: event.registrationDeadline?.split('T')[0] || '',
      registrationLimit: event.registrationLimit || '',
      registrationFee: event.registrationFee || 0,
      status: event.status || ''
    });
  };

  const closeEditModal = () => {
    setEditingEvent(null);
    setEditFormData({});
  };

  const handleSaveEvent = async () => {
    if (!editingEvent) return;

    try {
      setIsSaving(true);
      const updateData = {};


      if (editingEvent.status === 'DRAFT') {
        updateData.name = editFormData.name;
        updateData.description = editFormData.description;
        updateData.eligibility = editFormData.eligibility;
        updateData.venue = editFormData.venue;
        updateData.startDate = editFormData.startDate;
        updateData.endDate = editFormData.endDate;
        updateData.registrationDeadline = editFormData.registrationDeadline;
        updateData.registrationLimit = parseInt(editFormData.registrationLimit);
        updateData.registrationFee = parseFloat(editFormData.registrationFee) || 0;
      }

      else if (editingEvent.status === 'PUBLISHED') {
        if (editFormData.description !== editingEvent.description) {
          updateData.description = editFormData.description;
        }
        if (editFormData.registrationDeadline !== editingEvent.registrationDeadline?.split('T')[0]) {
          updateData.registrationDeadline = editFormData.registrationDeadline;
        }
        if (parseInt(editFormData.registrationLimit) >= editingEvent.registrationLimit) {
          updateData.registrationLimit = parseInt(editFormData.registrationLimit);
        }
      }

      else if (['ONGOING', 'COMPLETED', 'CLOSED'].includes(editingEvent.status)) {
        if (editFormData.status && editFormData.status !== editingEvent.status) {
          updateData.status = editFormData.status;
        }
      }

      await eventAPI.updateEvent(editingEvent._id, updateData);
      closeEditModal();
      await fetchDashboardData();
      alert('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewParticipants = async (event) => {
    try {
      setViewingParticipants(event);
      setParticipantsLoading(true);
      setParticipantSearch('');
      const regs = await registrationAPI.getEventRegistrations(event._id);
      const regsList = Array.isArray(regs) ? regs : regs.registrations || [];
      setParticipants(regsList);
    } catch (error) {
      console.error('Error fetching participants:', error);
      alert('Failed to load participants: ' + error.message);
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleExportCSV = async (eventId) => {
    try {
      await registrationAPI.exportRegistrationsCSV(eventId);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV: ' + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentPage');
    window.location.reload();
  };

  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel this event? All active registrations will also be cancelled.')) {
      return;
    }
    try {
      await eventAPI.cancelEvent(eventId);
      await fetchDashboardData();
      alert('Event cancelled successfully');
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event: ' + error.message);
    }
  };

  const handleApprovePayment = async (registrationId) => {
    try {
      await registrationAPI.approvePayment(registrationId);

      if (viewingParticipants) {
        const regs = await registrationAPI.getEventRegistrations(viewingParticipants._id);
        const regsList = Array.isArray(regs) ? regs : regs.registrations || [];
        setParticipants(regsList);
      }
      alert('Payment approved! QR/ticket generated and email sent.');
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve: ' + error.message);
    }
  };

  const handleRejectPayment = async (registrationId) => {
    const notes = prompt('Reason for rejection (optional):');
    try {
      await registrationAPI.rejectPayment(registrationId, notes || '');

      if (viewingParticipants) {
        const regs = await registrationAPI.getEventRegistrations(viewingParticipants._id);
        const regsList = Array.isArray(regs) ? regs : regs.registrations || [];
        setParticipants(regsList);
      }
      alert('Payment rejected.');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: '#888',
      PUBLISHED: '#4caf50',
      ONGOING: '#2196f3',
      COMPLETED: '#9c27b0',
      CLOSED: '#f44336'
    };
    return colors[status] || '#888';
  };

  const filteredParticipants = participants.filter(reg => {
    if (!participantSearch) return true;
    const search = participantSearch.toLowerCase();
    const name = `${reg.participant?.firstName || ''} ${reg.participant?.lastName || ''}`.toLowerCase();
    const email = (reg.participant?.email || '').toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <nav className="dashboard-nav">
          <div className="nav-brand">Felicity - Organizer</div>
          <div className="nav-menu">
            <button className="nav-item active">Dashboard</button>
            <button className="nav-item" onClick={() => onNavigate && onNavigate('create-event')}>Create Event</button>
            <button className="nav-item" onClick={() => onNavigate && onNavigate('ongoing-events')}>Ongoing Events</button>
            <button className="nav-item" onClick={() => onNavigate && onNavigate('organizer-profile')}>Profile</button>
          </div>
        </nav>
        <div className="dashboard-content">
          <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }


  const totalRevenue = events.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
  const totalAttendance = events.reduce((sum, e) => sum + (e.attendanceCount || 0), 0);

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">Felicity - Organizer</div>
        <div className="nav-menu">
          <button className="nav-item active" onClick={() => onNavigate && onNavigate('dashboard')}>Dashboard</button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('create-event')}>Create Event</button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('ongoing-events')}>Ongoing Events</button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('organizer-profile')}>Profile</button>
          <button className="nav-item logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>{profile?.organizerName}</h1>
          <p>{profile?.category} • {profile?.contactEmail}</p>
        </div>

        {/* Event Analytics Section */}
        <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
          <div className="dashboard-card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#888' }}>Total Events</h3>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>{events.length}</p>
          </div>
          <div className="dashboard-card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#888' }}>Total Registrations</h3>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>{events.reduce((sum, e) => sum + (e.registrationCount || 0), 0)}</p>
          </div>
          <div className="dashboard-card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#888' }}>Total Revenue</h3>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>₹{totalRevenue}</p>
          </div>
          <div className="dashboard-card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#888' }}>Attendance</h3>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>{totalAttendance}</p>
          </div>
          <div className="dashboard-card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#888' }}>Published</h3>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>{events.filter(e => e.status === 'PUBLISHED').length}</p>
          </div>
          <div className="dashboard-card" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#888' }}>Completed</h3>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>{events.filter(e => e.status === 'COMPLETED').length}</p>
          </div>
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-card full-width">
            <div className="card-header">
              <h2>Your Events</h2>
              <button className="create-btn" onClick={() => onNavigate && onNavigate('create-event')}>+ Create New Event</button>
            </div>
            {events && events.length > 0 ? (
              <div className="events-grid">
                {events.map((event) => (
                  <div key={event._id} className="event-card">
                    <div className="event-card-header">
                      <div className="event-card-title">
                        <h3>{event.name}</h3>
                        <span className="event-card-type">{event.type}</span>
                      </div>
                      <span className="event-card-status" style={{ borderColor: getStatusColor(event.status), color: getStatusColor(event.status) }}>
                        {event.status}
                      </span>
                    </div>

                    <div className="event-card-body">
                      <div className="event-card-info">
                        <div className="info-item">
                          <div>
                            <span className="info-label">Start Date</span>
                            <span className="info-value">{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>

                        <div className="info-item">
                          <div>
                            <span className="info-label">{event.type === 'MERCHANDISE' ? 'Orders' : 'Registrations'}</span>
                            <span className="info-value registration-count">
                              {event.type === 'MERCHANDISE'
                                ? (event.registrationCount || 0)
                                : `${event.registrationCount || 0} / ${event.registrationLimit}`
                              }
                            </span>
                          </div>
                        </div>

                        {event.pendingCount > 0 && (
                          <div className="info-item">
                            <div>
                              <span className="info-label" style={{ color: '#ffa726' }}> Pending Approvals</span>
                              <span className="info-value" style={{ color: '#ffa726', fontWeight: '700' }}>{event.pendingCount}</span>
                            </div>
                          </div>
                        )}

                        {event.isFormLocked && (
                          <div className="info-item">
                            <div>
                              <span className="info-label" style={{ color: '#d9683a' }}> Form Locked</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="event-card-footer">
                      {event.status === 'DRAFT' && (
                        <>
                          <button
                            className="card-action-btn edit"
                            onClick={() => openEditModal(event)}
                            title="Edit Event"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            className="card-action-btn publish"
                            onClick={() => handlePublishEvent(event._id)}
                            disabled={publishing[event._id]}
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {publishing[event._id] ? 'Publishing...' : 'Publish'}
                          </button>
                        </>
                      )}
                      {event.status === 'PUBLISHED' && (
                        <button
                          className="card-action-btn edit"
                          onClick={() => openEditModal(event)}
                          title="Edit Published Event"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}
                      {['ONGOING', 'COMPLETED'].includes(event.status) && (
                        <button
                          className="card-action-btn edit"
                          onClick={() => openEditModal(event)}
                          title="Change Status"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Update
                        </button>
                      )}
                      {/* View Participants & Export CSV — always visible */}
                      {event.status !== 'DRAFT' && (
                        <>
                          <button
                            className="card-action-btn edit"
                            onClick={() => handleViewParticipants(event)}
                            title="View Participants"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Participants
                          </button>
                          <button
                            className="card-action-btn edit"
                            onClick={() => handleExportCSV(event._id)}
                            title="Export CSV"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            CSV
                          </button>
                          <button
                            className="card-action-btn edit"
                            onClick={() => onEventClick && onEventClick(event._id)}
                            title="View Discussion Forum"
                          >
                            Forum
                          </button>
                          {['PUBLISHED', 'ONGOING'].includes(event.status) && (
                            <button
                              className="card-action-btn publish"
                              onClick={() => {
                                if (onNavigate) {
                                  localStorage.setItem('selectedEventId', event._id);
                                  onNavigate('attendance');
                                }
                              }}
                              title="Scan Attendance"
                            >
                              Attendance
                            </button>
                          )}
                        </>
                      )}
                      {/* Cancel Event — DRAFT and PUBLISHED */}
                      {['DRAFT', 'PUBLISHED'].includes(event.status) && (
                        <button
                          className="card-action-btn cancel"
                          onClick={() => handleCancelEvent(event._id)}
                          title="Cancel Event"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No events created yet. Start by creating your first event!</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Event</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>

            <div className="edit-modal-content">
              <div className="edit-info-box">
                <p><strong>Event:</strong> {editingEvent.name}</p>
                <p><strong>Current Status:</strong> <span style={{ color: getStatusColor(editingEvent.status) }}>● {editingEvent.status}</span></p>
                {editingEvent.status === 'DRAFT' && (
                  <p className="status-help">Draft events can be fully edited</p>
                )}
                {editingEvent.status === 'PUBLISHED' && (
                  <p className="status-help">Published events: description, deadline, and registration limit (increase only)</p>
                )}
                {['ONGOING', 'COMPLETED'].includes(editingEvent.status) && (
                  <p className="status-help">Ongoing/Completed events: status change only</p>
                )}
              </div>

              <div className="edit-form">
                {editingEvent.status === 'DRAFT' && (
                  <>
                    <div className="form-group">
                      <label>Event Name</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        placeholder="Event name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={editFormData.description || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        placeholder="Event description"
                        rows="4"
                      />
                    </div>

                    <div className="form-group">
                      <label>Eligibility</label>
                      <select
                        value={editFormData.eligibility || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, eligibility: e.target.value })}
                      >
                        <option value="ALL">All</option>
                        <option value="IIIT_ONLY">IIIT Only</option>
                        <option value="NON_IIIT">Non-IIIT</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Venue</label>
                      <input
                        type="text"
                        value={editFormData.venue || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                        placeholder="Event venue"
                      />
                    </div>

                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={editFormData.startDate || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={editFormData.endDate || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Registration Deadline</label>
                      <input
                        type="date"
                        value={editFormData.registrationDeadline || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, registrationDeadline: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Registration Limit</label>
                      <input
                        type="number"
                        value={editFormData.registrationLimit || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, registrationLimit: e.target.value })}
                        min={1}
                      />
                    </div>

                    <div className="form-group">
                      <label>Registration Fee (₹)</label>
                      <input
                        type="number"
                        value={editFormData.registrationFee || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, registrationFee: e.target.value })}
                        min={0}
                      />
                    </div>
                  </>
                )}

                {editingEvent.status === 'PUBLISHED' && (
                  <>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={editFormData.description || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        placeholder="Event description"
                        rows="4"
                      />
                    </div>

                    <div className="form-group">
                      <label>Registration Deadline</label>
                      <input
                        type="date"
                        value={editFormData.registrationDeadline || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, registrationDeadline: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Registration Limit (can only increase)</label>
                      <input
                        type="number"
                        value={editFormData.registrationLimit || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, registrationLimit: e.target.value })}
                        min={editingEvent.registrationLimit || 1}
                      />
                      <small>Current limit: {editingEvent.registrationLimit}. Can only increase.</small>
                    </div>
                  </>
                )}

                {['ONGOING', 'COMPLETED', 'CLOSED'].includes(editingEvent.status) && (
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={editFormData.status || editingEvent.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <option value="ONGOING">Ongoing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="edit-modal-actions">
                <button className="cancel-btn" onClick={closeEditModal}>Cancel</button>
                <button
                  className="save-btn"
                  onClick={handleSaveEvent}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {viewingParticipants && (
        <div className="edit-modal-overlay" onClick={() => setViewingParticipants(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: viewingParticipants.type === 'MERCHANDISE' ? '1100px' : '800px' }}>
            <div className="edit-modal-header">
              <h3>Participants — {viewingParticipants.name}</h3>
              <button className="modal-close" onClick={() => setViewingParticipants(null)}>✕</button>
            </div>

            <div className="edit-modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  style={{ flex: 1, marginRight: '12px', padding: '8px 12px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
                <button className="save-btn" onClick={() => handleExportCSV(viewingParticipants._id)} style={{ whiteSpace: 'nowrap' }}>
                  Export CSV
                </button>
              </div>

              {participantsLoading ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '30px 0' }}>Loading participants...</p>
              ) : filteredParticipants.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '30px 0' }}>No participants registered yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Name</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Email</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Reg Date</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Status</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Payment</th>
                        {viewingParticipants?.type === 'MERCHANDISE' && (
                          <>
                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Item</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Proof</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Actions</th>
                          </>
                        )}
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888', fontWeight: '600' }}>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map((reg) => (
                        <tr key={reg._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 8px', color: '#ddd' }}>{reg.participant?.firstName} {reg.participant?.lastName}</td>
                          <td style={{ padding: '10px 8px', color: '#aaa' }}>{reg.participant?.email}</td>
                          <td style={{ padding: '10px 8px', color: '#aaa' }}>{new Date(reg.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              color: reg.status === 'REGISTERED' || reg.status === 'APPROVED' ? '#4caf50'
                                : reg.status === 'CANCELLED' || reg.status === 'REJECTED' ? '#f44336'
                                  : reg.status === 'PENDING' ? '#ffa726' : '#888',
                              fontWeight: '500'
                            }}>
                              {reg.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', color: '#aaa' }}>₹{reg.amountPaid || 0}</td>
                          {viewingParticipants?.type === 'MERCHANDISE' && (
                            <>
                              <td style={{ padding: '10px 8px', color: '#ddd', fontSize: '12px' }}>
                                {reg.merchandiseSelection?.itemName || '-'}
                                {reg.merchandiseSelection?.size ? ` / ${reg.merchandiseSelection.size}` : ''}
                                {reg.merchandiseSelection?.color ? ` / ${reg.merchandiseSelection.color}` : ''}
                                {' ×'}{reg.merchandiseSelection?.quantity || 1}
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                {reg.paymentProofUrl ? (
                                  <img
                                    src={reg.paymentProofUrl}
                                    alt="Proof"
                                    style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}
                                    onClick={() => setProofViewUrl(reg.paymentProofUrl)}
                                    title="Click to view full image"
                                  />
                                ) : (
                                  <span style={{ color: '#888', fontSize: '12px' }}>Not uploaded</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                {reg.status === 'PENDING' && reg.paymentProofUrl && (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      onClick={() => handleApprovePayment(reg._id)}
                                      style={{ padding: '4px 10px', fontSize: '12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >Approve</button>
                                    <button
                                      onClick={() => handleRejectPayment(reg._id)}
                                      style={{ padding: '4px 10px', fontSize: '12px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >Reject</button>
                                  </div>
                                )}
                                {reg.status === 'APPROVED' && <span style={{ color: '#4caf50', fontSize: '12px' }}>Approved</span>}
                                {reg.status === 'REJECTED' && <span style={{ color: '#f44336', fontSize: '12px' }}>✗ Rejected</span>}
                                {reg.status === 'PENDING' && !reg.paymentProofUrl && <span style={{ color: '#ffa726', fontSize: '12px' }}>Awaiting proof</span>}
                              </td>
                            </>
                          )}
                          <td style={{ padding: '10px 8px', color: reg.attendanceMarked ? '#4caf50' : '#888' }}>
                            {reg.attendanceMarked ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ color: '#888', fontSize: '12px', marginTop: '12px', textAlign: 'right' }}>
                    Total: {filteredParticipants.length} participant(s)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Proof Image Viewer */}
      {proofViewUrl && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setProofViewUrl(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={proofViewUrl}
              alt="Payment Proof"
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={() => setProofViewUrl(null)}
              style={{
                position: 'absolute', top: '-12px', right: '-12px',
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#d9683a', color: '#fff', border: 'none',
                fontSize: '18px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizerDashboard;
