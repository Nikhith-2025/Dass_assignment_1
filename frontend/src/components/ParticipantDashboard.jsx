import { useState, useEffect } from 'react';
import '../styles/ParticipantDashboard.css';
import '../styles/ForumSection.css';
import { registrationAPI, notificationAPI } from '../api/apiClient';

function ParticipantDashboard({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      setUser(userData);


      try {
        const regsResponse = await registrationAPI.getRegistrations();
        const regsList = Array.isArray(regsResponse) ? regsResponse : regsResponse.registrations || [];
        setRegistrations(regsList);
      } catch (err) {
        console.error('Error fetching registrations:', err);
        setRegistrations([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await notificationAPI.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleCancelRegistration = async (registrationId, eventName) => {
    if (!window.confirm(`Are you sure you want to cancel your registration for "${eventName}"?`)) return;
    try {
      await registrationAPI.cancelRegistration(registrationId);
      alert('Registration cancelled successfully.');
      fetchDashboardData();
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert('Failed to cancel registration: ' + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentPage');
    window.location.reload();
  };


  const downloadTicket = (ticket) => {
    const ticketText = `
EVENT TICKET
============

Event: ${ticket.event?.name}
Organizer: ${ticket.event?.organizer?.organizerName}
Date: ${new Date(ticket.event?.startDate).toLocaleDateString()}
Time: ${new Date(ticket.event?.startDate).toLocaleTimeString()}
Ticket ID: ${ticket.ticketId}
Status: ${ticket.status}

Please present this ticket at the event entrance.
    `.trim();

    const blob = new Blob([ticketText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticketId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };


  const printTicket = () => {
    const printContent = document.querySelector('.ticket-display');
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Ticket</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; padding: 20px; }
      .ticket-display { max-width: 600px; margin: 0 auto; }
      h2 { text-align: center; color: #333; }
      .ticket-header { border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
      .ticket-header h3 { margin: 0; font-size: 24px; }
      .organizer { margin: 5px 0; color: #666; }
      .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
      .label { font-weight: bold; color: #333; }
      .value { color: #666; }
      .ticket-qrcode { text-align: center; margin: 30px 0; }
      .ticket-qrcode img { max-width: 200px; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return registrations.filter(reg =>
      reg.event && new Date(reg.event.startDate) > now &&
      !['CANCELLED', 'REJECTED'].includes(reg.status)
    );
  };

  const filterByStatus = (status) => {
    if (status === 'upcoming') return getUpcomingEvents();
    return registrations.filter(reg => reg.status === status);
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming Events', count: getUpcomingEvents().length },
    { id: 'ACTIVE', label: 'Normal Events', count: registrations.filter(r => ['REGISTERED', 'APPROVED'].includes(r.status) && r.registrationType === 'NORMAL').length },
    { id: 'MERCHANDISE', label: 'Merchandise', count: registrations.filter(r => r.registrationType === 'MERCHANDISE' && !['CANCELLED', 'REJECTED'].includes(r.status)).length },
    { id: 'COMPLETED', label: 'Completed', count: registrations.filter(r => r.status === 'COMPLETED').length },
    { id: 'CANCELLED', label: 'Cancelled', count: registrations.filter(r => ['CANCELLED', 'REJECTED'].includes(r.status)).length }
  ];

  const getDisplayData = () => {
    if (activeTab === 'upcoming') return getUpcomingEvents();
    if (activeTab === 'MERCHANDISE') return registrations.filter(r => r.registrationType === 'MERCHANDISE' && !['CANCELLED', 'REJECTED'].includes(r.status));
    if (activeTab === 'ACTIVE') return registrations.filter(r => ['REGISTERED', 'APPROVED'].includes(r.status) && r.registrationType === 'NORMAL');
    if (activeTab === 'COMPLETED') return registrations.filter(r => r.status === 'COMPLETED');
    if (activeTab === 'CANCELLED') return registrations.filter(r => ['CANCELLED', 'REJECTED'].includes(r.status));
    return [];
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <nav className="dashboard-nav">
          <div className="nav-brand">Felicity</div>
          <div className="nav-menu">
            <button className="nav-item active">Dashboard</button>
            <button className="nav-item" onClick={() => onNavigate && onNavigate('browse-events')}>Browse Events</button>
            <button className="nav-item" onClick={() => onNavigate && onNavigate('clubs')}>Clubs/Organizers</button>
            <button className="nav-item" onClick={() => onNavigate && onNavigate('participant-profile')}>Profile</button>
          </div>
        </nav>
        <div className="dashboard-content">
          <div className="welcome-section">
            <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayData = getDisplayData();

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">Felicity</div>
        <div className="nav-menu">
          <button className="nav-item active" onClick={() => onNavigate && onNavigate('dashboard')}>Dashboard</button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('browse-events')}>Browse Events</button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('clubs')}>Clubs/Organizers</button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('participant-profile')}>Profile</button>
          <div style={{ position: 'relative' }}>
            <button className="notification-bell" onClick={() => setShowNotifications(!showNotifications)}>
              🔔
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h4>Notifications</h4>
                  {unreadCount > 0 && <button onClick={handleMarkAllRead}>Mark all read</button>}
                </div>
                {notifications.length === 0 ? (
                  <p className="notification-empty">No notifications yet</p>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <div key={n._id} className={`notification-item ${!n.read ? 'unread' : ''}`}
                      onClick={async () => {
                        if (!n.read) {
                          await notificationAPI.markAsRead(n._id);
                          setUnreadCount(prev => Math.max(0, prev - 1));
                          setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
                        }
                      }}
                    >
                      <p>{n.message}</p>
                      <small>{new Date(n.createdAt).toLocaleString()}</small>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="nav-item logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Welcome back, {user?.firstName || 'Participant'}!</h1>
          <p>Manage your event registrations and explore new opportunities</p>
        </div>

        <div className="dashboard-card full-width">
          <div className="card-header">
            <h2>My Events</h2>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Events List */}
          {displayData.length === 0 ? (
            <p className="empty-state">No {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} events.</p>
          ) : (
            <div className="events-table">
              {displayData.map((reg) => (
                <div key={reg._id} className="event-row">
                  <div className="event-info">
                    <h3>{reg.event?.name || 'Unknown Event'}</h3>
                    <div className="event-meta">
                      <span className="badge">{reg.event?.type || 'Normal'}</span>
                      <span>{reg.event?.organizer?.organizerName || 'Unknown Organizer'}</span>
                      <span>{new Date(reg.event?.startDate).toLocaleDateString() || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="event-status">
                    <span className={`status-badge ${reg.status?.toLowerCase()}`}>{reg.status}</span>
                    {reg.ticketId && (
                      <div className="ticket-actions">
                        <button
                          className="ticket-btn"
                          onClick={() => setSelectedTicket(reg)}
                          title="View Ticket"
                        >
                          View Ticket
                        </button>
                      </div>
                    )}

                    {['REGISTERED', 'APPROVED', 'COMPLETED'].includes(reg.status) && reg.event?._id && (
                      <button
                        className="ticket-btn"
                        style={{ background: 'rgba(217, 104, 58, 0.15)', color: '#d9683a', marginTop: '6px' }}
                        onClick={() => onNavigate && onNavigate('event-details', reg.event._id)}
                        title="Discussion Forum"
                      >
                        Forum
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <button className="action-btn" onClick={() => onNavigate && onNavigate('browse-events')}>Browse Events</button>
              <button className="action-btn" onClick={() => onNavigate && onNavigate('clubs')}>Explore Clubs</button>
              <button className="action-btn" onClick={() => onNavigate && onNavigate('participant-profile')}>Edit Profile</button>
            </div>
          </div>
        </div>
      </div>

      {selectedTicket && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ticket-modal-close" onClick={() => setSelectedTicket(null)}>✕</button>

            <div className="ticket-display">
              <h2>{selectedTicket.registrationType === 'MERCHANDISE' ? 'Purchase Receipt' : 'Event Ticket'}</h2>

              <div className="ticket-content">
                <div className="ticket-header">
                  <h3>{selectedTicket.event?.name}</h3>
                  <p className="organizer">{selectedTicket.event?.organizer?.organizerName}</p>
                </div>

                <div className="ticket-details">
                  <div className="detail-row">
                    <span className="label">Participant Name:</span>
                    <span className="value">{user?.firstName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Event Date:</span>
                    <span className="value">{new Date(selectedTicket.event?.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Event Time:</span>
                    <span className="value">{new Date(selectedTicket.event?.startDate).toLocaleTimeString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Ticket ID:</span>
                    <span className="value ticket-id">{selectedTicket.ticketId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className={`value status-badge ${selectedTicket.status?.toLowerCase()}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {selectedTicket.qrCodeUrl && (
                  <div className="ticket-qrcode">
                    <p>Scan QR Code at Event Entrance</p>
                    <img src={selectedTicket.qrCodeUrl} alt="QR Code" />
                  </div>
                )}

                {selectedTicket.registrationType === 'MERCHANDISE' && selectedTicket.merchandiseSelections && (
                  <div className="ticket-details" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#d9683a' }}>Items Purchased</h4>
                    {selectedTicket.merchandiseSelections.map((item, i) => (
                      <div key={i} className="detail-row">
                        <span className="label">{item.itemName || 'Item'}</span>
                        <span className="value">{item.size && `${item.size} / `}{item.color && `${item.color} / `}x{item.quantity} — ₹{item.price || 0}</span>
                      </div>
                    ))}
                    {selectedTicket.paymentAmount && (
                      <div className="detail-row" style={{ borderTop: '2px solid rgba(217,104,58,0.3)', marginTop: '8px', paddingTop: '8px' }}>
                        <span className="label" style={{ fontWeight: '700' }}>Total</span>
                        <span className="value" style={{ color: '#d9683a', fontWeight: '700' }}>₹{selectedTicket.paymentAmount}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="ticket-actions">
                  <button
                    className="ticket-action-btn download-btn"
                    onClick={() => downloadTicket(selectedTicket)}
                  >
                    Download
                  </button>
                  <button
                    className="ticket-action-btn print-btn"
                    onClick={() => printTicket()}
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParticipantDashboard;
