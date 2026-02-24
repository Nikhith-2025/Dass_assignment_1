const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API Error');
  }

  return response.json();
}

export const authAPI = {
  signup: (data) => apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  login: (email, password, recaptchaToken) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      recaptchaToken
    })
  })
};

export const participantAPI = {
  getProfile: () => apiCall('/participants/profile'),
  updateProfile: (data) => apiCall('/participants/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updatePreferences: (interests) => apiCall('/participants/preferences', {
    method: 'PUT',
    body: JSON.stringify({ interests })
  }),
  skipOnboarding: () => apiCall('/participants/skip-onboarding', {
    method: 'POST'
  }),
  getRegistrations: (status) => apiCall(`/registrations/me${status ? `?status=${status}` : ''}`),
  changePassword: (currentPassword, newPassword) => apiCall('/participants/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  }),
  followOrganizer: (organizerId) => apiCall('/participants/follow', {
    method: 'POST',
    body: JSON.stringify({ organizerId })
  }),
  unfollowOrganizer: (organizerId) => apiCall('/participants/unfollow', {
    method: 'POST',
    body: JSON.stringify({ organizerId })
  }),
  getAllOrganizers: () => apiCall('/participants/organizers'),
  getFollowedClubs: () => apiCall('/participants/followed-clubs')
};

export const eventAPI = {
  browseEvents: (filters) => {
    const params = new URLSearchParams(filters).toString();
    return apiCall(`/events/browse${params ? `?${params}` : ''}`);
  },
  getTrendingEvents: () => apiCall('/events/trending'),
  getEventDetail: (id) => apiCall(`/events/${id}`),
  getOrganizerPublicEvents: (organizerId) => apiCall(`/events/organizer/${organizerId}`),
  createEvent: (data) => apiCall('/events', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateEvent: (id, data) => apiCall(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  publishEvent: (id) => apiCall(`/events/${id}/publish`, {
    method: 'POST'
  }),
  cancelEvent: (id) => apiCall(`/events/${id}/cancel`, {
    method: 'POST'
  }),
  getOrganizerEvents: () => apiCall('/events/organizer/events')
};

export const registrationAPI = {
  registerForEvent: (eventId, formData) => apiCall('/registrations/event/register', {
    method: 'POST',
    body: JSON.stringify({ eventId, formData })
  }),
  purchaseMerchandise: (eventId, items) =>
    apiCall('/registrations/merchandise/purchase', {
      method: 'POST',
      body: JSON.stringify({ eventId, items })
    }),
  getRegistrations: () => apiCall('/registrations/me'),
  getEventRegistrations: (eventId) => apiCall(`/registrations/event/${eventId}`),
  exportRegistrationsCSV: async (eventId) => {
    const token = localStorage.getItem('token');
    const API_URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_URL_BASE}/registrations/event/${eventId}/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to export CSV');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${eventId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  cancelRegistration: (registrationId) => apiCall(`/registrations/${registrationId}/cancel`, {
    method: 'POST'
  }),
  uploadPaymentProof: (registrationId, paymentProof) => apiCall(`/registrations/upload-proof/${registrationId}`, {
    method: 'POST',
    body: JSON.stringify({ paymentProof })
  }),
  approvePayment: (registrationId) => apiCall(`/registrations/${registrationId}/approve`, {
    method: 'POST'
  }),
  rejectPayment: (registrationId, notes) => apiCall(`/registrations/${registrationId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  }),

  scanQR: (ticketId) => apiCall('/registrations/scan-qr', {
    method: 'POST',
    body: JSON.stringify({ ticketId })
  }),
  getAttendanceStats: (eventId) => apiCall(`/registrations/event/${eventId}/attendance`),
  exportAttendanceCSV: async (eventId) => {
    const token = localStorage.getItem('token');
    const API_URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_URL_BASE}/registrations/event/${eventId}/attendance/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to export attendance CSV');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${eventId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  markAttendance: (registrationId, attended, reason) => apiCall(`/registrations/${registrationId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ attended, reason })
  })
};

export const organizerAPI = {
  getAllOrganizers: () => apiCall('/organizers'),
  getOrganizerDetail: (id) => apiCall(`/organizers/${id}`),
  getProfile: () => apiCall('/organizers/profile/me'),
  updateProfile: (data) => apiCall('/organizers/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  requestPasswordReset: (reason) => apiCall('/organizers/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ reason })
  })
};

export const adminAPI = {
  getDashboardStats: () => apiCall('/admin/dashboard'),
  getAllOrganizers: () => apiCall('/admin/organizers'),
  createOrganizer: (data) => apiCall('/admin/organizers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  removeOrganizer: (id, action) => apiCall(`/admin/organizers/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ action })
  }),
  getPasswordResetRequests: () => apiCall('/admin/password-reset-requests'),
  approvePasswordReset: (requestId, comment) => apiCall(`/admin/password-reset-requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment })
  }),
  rejectPasswordReset: (requestId, comment) => apiCall(`/admin/password-reset-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment })
  })
};

export const forumAPI = {
  getMessages: (eventId, page = 1) => apiCall(`/forum/${eventId}/messages?page=${page}`),
  postMessage: (eventId, content, parentId, isAnnouncement) => apiCall(`/forum/${eventId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, parentId, isAnnouncement })
  }),
  deleteMessage: (eventId, messageId) => apiCall(`/forum/${eventId}/messages/${messageId}`, {
    method: 'DELETE'
  }),
  togglePin: (eventId, messageId) => apiCall(`/forum/${eventId}/messages/${messageId}/pin`, {
    method: 'POST'
  }),
  reactToMessage: (eventId, messageId, emoji) => apiCall(`/forum/${eventId}/messages/${messageId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji })
  })
};

export const notificationAPI = {
  getNotifications: () => apiCall('/notifications'),
  markAsRead: (id) => apiCall(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => apiCall('/notifications/read-all', { method: 'POST' })
};
