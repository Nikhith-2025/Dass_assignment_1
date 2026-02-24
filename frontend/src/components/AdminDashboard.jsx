import { useState, useEffect } from 'react';
import '../styles/AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function AdminDashboard({ onNavigate, activeView = 'dashboard' }) {
  const [organizers, setOrganizers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalOrganizers: 0,
    activeOrganizers: 0,
    inactiveOrganizers: 0
  });
  const [newOrganizer, setNewOrganizer] = useState({
    organizerName: '',
    category: 'CLUB',
    description: '',
    contactEmail: ''
  });
  const [resetRequests, setResetRequests] = useState([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchOrganizers();
    fetchDashboardStats();
    fetchResetRequests();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/admin/organizers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch organizers');
        setOrganizers([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setOrganizers(data.organizers || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching organizers:', error);
      setOrganizers([]);
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch(`${API_URL}/admin/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch dashboard stats');
        return;
      }

      const data = await response.json();
      setStats({
        totalParticipants: data.totalParticipants || 0,
        totalOrganizers: data.totalOrganizers || 0,
        activeOrganizers: data.activeOrganizers || 0,
        inactiveOrganizers: data.inactiveOrganizers || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        setCreating(false);
        return;
      }

      const response = await fetch(`${API_URL}/admin/organizers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOrganizer)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Failed to create organizer');
        setCreating(false);
        return;
      }


      setCreatedCredentials({
        email: data.generatedEmail,
        password: data.generatedPassword
      });
      setShowCreateModal(false);
      setNewOrganizer({
        organizerName: '',
        category: 'CLUB',
        description: '',
        contactEmail: ''
      });
      fetchOrganizers();
      fetchDashboardStats();
    } catch (error) {
      console.error('Error creating organizer:', error);
      alert('Error creating organizer: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveOrganizer = async (organizerId, action = 'disable') => {
    if (!confirm(`Are you sure you want to ${action} this organizer?`)) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch(`${API_URL}/admin/organizers/${organizerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || `Failed to ${action} organizer`);
        return;
      }

      alert(`Organizer ${action}d successfully!`);
      fetchOrganizers();
      fetchDashboardStats();
    } catch (error) {
      console.error(`Error ${action}ing organizer:`, error);
      alert(`Error ${action}ing organizer: ` + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentPage');
    window.location.reload();
  };

  const fetchResetRequests = async () => {
    try {
      setResetLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/password-reset-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResetRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching reset requests:', error);
    } finally {
      setResetLoading(false);
    }
  };

  const handleApproveReset = async (requestId) => {
    const comment = prompt('Add a comment (optional):');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/password-reset-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Password reset approved!\nNew password: ${data.newPassword}\nOrganizer email: ${data.organizerEmail}\n\nShare this password with the organizer.`);
        fetchResetRequests();
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to approve');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleRejectReset = async (requestId) => {
    const comment = prompt('Reason for rejection:');
    if (comment === null) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/password-reset-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment })
      });

      if (response.ok) {
        alert('Password reset request rejected.');
        fetchResetRequests();
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to reject');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">Felicity-Admin</div>
        <div className="nav-menu">
          <button
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-item ${activeView === 'manage-organizers' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('manage-organizers')}
          >
            Manage Clubs/Organizers
          </button>
          <button
            className={`nav-item ${activeView === 'password-resets' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('password-resets')}
          >
            Password Reset Requests
          </button>
          <button className="nav-item logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Admin Dashboard</h1>
          <p>Manage clubs, organizers, and system settings</p>
        </div>

        {activeView === 'dashboard' && (
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Total Participants</h2>
              <p className="stat-value">{stats.totalParticipants}</p>
            </div>
            <div className="dashboard-card">
              <h2>Total Organizers</h2>
              <p className="stat-value">{stats.totalOrganizers}</p>
            </div>
            <div className="dashboard-card">
              <h2>Active Organizers</h2>
              <p className="stat-value">{stats.activeOrganizers}</p>
            </div>
            <div className="dashboard-card">
              <h2>Inactive Organizers</h2>
              <p className="stat-value">{stats.inactiveOrganizers}</p>
            </div>
          </div>
        )}

        {activeView === 'manage-organizers' && (
          <div className="dashboard-grid">
            <div className="dashboard-card full-width">
              <div className="card-header">
                <h2>Clubs & Organizers</h2>
                <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                  + Add New Organizer
                </button>
              </div>
              {organizers.length === 0 ? (
                <p className="empty-state">No organizers yet. Create one to get started!</p>
              ) : (
                <div className="organizer-list">
                  {organizers.map((org) => (
                    <div key={org._id} className={`organizer-item ${!org.isActive ? 'disabled-organizer' : ''}`}>
                      <div className="organizer-info">
                        <h3>
                          {org.organizerName}
                          <span className={`status-badge status-${org.isActive ? 'active' : 'disabled'}`} style={{ marginLeft: '10px', fontSize: '11px' }}>
                            {org.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </h3>
                        <p>{org.category} • {org.contactEmail}</p>
                        <p className="muted">Login: {org.user?.email || 'N/A'}</p>
                      </div>
                      <div className="organizer-actions">
                        {org.isActive ? (
                          <button className="action-btn" onClick={() => handleRemoveOrganizer(org._id, 'disable')}>Disable</button>
                        ) : (
                          <button className="action-btn" style={{ background: '#000000', borderColor: '#4caf50' }} onClick={() => handleRemoveOrganizer(org._id, 'enable')}>Enable</button>
                        )}
                        <button className="action-btn danger" onClick={() => handleRemoveOrganizer(org._id, 'delete')}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'password-resets' && (
          <div className="dashboard-grid">
            <div className="dashboard-card full-width">
              <div className="card-header">
                <h2>Password Reset Requests</h2>
                <button className="create-btn" onClick={fetchResetRequests}>↻ Refresh</button>
              </div>
              {resetLoading ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>Loading requests...</p>
              ) : resetRequests.length === 0 ? (
                <p className="empty-state">No password reset requests.</p>
              ) : (
                <div className="organizer-list">
                  {resetRequests.map((req) => (
                    <div key={req._id} className="organizer-item">
                      <div className="organizer-info">
                        <h3>{req.organizer?.organizerName || 'Unknown'}</h3>
                        <p>{req.organizer?.category} • {req.user?.email}</p>
                        <p style={{ margin: '6px 0', color: '#ccc' }}><strong>Reason:</strong> {req.reason}</p>
                        <p className="muted">Requested: {new Date(req.createdAt).toLocaleString()}</p>
                        {req.adminComment && <p className="muted"><strong>Admin note:</strong> {req.adminComment}</p>}
                        {req.status === 'APPROVED' && req.generatedPassword && (
                          <p style={{ color: '#4caf50', fontFamily: 'monospace' }}><strong>Generated password:</strong> {req.generatedPassword}</p>
                        )}
                      </div>
                      <div className="organizer-actions">
                        <span className={`status-badge status-${req.status.toLowerCase()}`}>{req.status}</span>
                        {req.status === 'PENDING' && (
                          <>
                            <button className="action-btn" style={{ background: '#080808ff' }} onClick={() => handleApproveReset(req._id)}>Approve</button>
                            <button className="action-btn danger" onClick={() => handleRejectReset(req._id)}>Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create New Organizer</h2>
            <form onSubmit={handleCreateOrganizer}>
              <div className="form-group">
                <label>Organizer Name</label>
                <input
                  type="text"
                  value={newOrganizer.organizerName}
                  onChange={e => setNewOrganizer({ ...newOrganizer, organizerName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newOrganizer.category}
                  onChange={e => setNewOrganizer({ ...newOrganizer, category: e.target.value })}
                  required
                >
                  <option value="CLUB">Club</option>
                  <option value="COUNCILS">Councils</option>
                  <option value="FEST TEAM">Fest Team</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newOrganizer.description}
                  onChange={e => setNewOrganizer({ ...newOrganizer, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Email (Credentials will be sent here)</label>
                <input
                  type="email"
                  value={newOrganizer.contactEmail}
                  onChange={e => setNewOrganizer({ ...newOrganizer, contactEmail: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="create-btn" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Organizer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {createdCredentials && (
        <div className="modal-overlay" onClick={() => setCreatedCredentials(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2 style={{ color: '#4caf50', marginBottom: '16px' }}>Organizer Created Successfully</h2>
            <p style={{ color: '#ccc', marginBottom: '20px' }}>The following credentials have been generated and also sent to the contact email:</p>
            <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Login Email</span>
                <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '15px', fontWeight: '600' }}>{createdCredentials.email}</span>
              </div>
              <div>
                <span style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Password</span>
                <span style={{ color: '#d9683a', fontFamily: 'monospace', fontSize: '15px', fontWeight: '600' }}>{createdCredentials.password}</span>
              </div>
            </div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '16px' }}>⚠ Save these credentials. The password cannot be retrieved later.</p>
            <div className="modal-actions">
              <button className="create-btn" onClick={() => {
                navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
                alert('Credentials copied to clipboard!');
              }}>
                Copy to Clipboard
              </button>
              <button type="button" onClick={() => setCreatedCredentials(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
