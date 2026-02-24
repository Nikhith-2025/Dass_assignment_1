import React, { useState, useEffect } from 'react';
import { eventAPI, registrationAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import ForumSection from '../components/ForumSection';
import '../styles/EventDetails.css';

const EventDetails = ({ eventId, onBack, isOrganizerView = false }) => {
  const { user, token } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({});
  const [merchandiseData, setMerchandiseData] = useState({});

  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPaymentProof, setShowPaymentProof] = useState(null); // registrationId
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    } else {
      setError('No event ID provided');
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (event && event.customFields) {
      const initialData = {};
      event.customFields.forEach(field => {
        initialData[field.name] = '';
      });
      setFormData(initialData);
    }
  }, [event]);

  const fetchEvent = async () => {
    try {
      const response = await eventAPI.getEventDetail(eventId);
      setEvent(response);
      setError('');

      if (token && user && user.role === 'participant') {
        try {
          const regs = await registrationAPI.getRegistrations();
          const regsList = Array.isArray(regs) ? regs : regs.registrations || [];
          const found = regsList.find(r => r.event?._id === eventId && !['CANCELLED', 'REJECTED'].includes(r.status));
          setIsRegistered(!!found);
        } catch (e) {
          console.error('Error checking registration status:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleFormInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleMerchandiseChange = (itemId, field, value) => {
    setMerchandiseData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleRegister = async () => {
    if (!token || !user) {
      setError('You must be logged in to register for events.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setRegistering(true);

      const response = await registrationAPI.registerForEvent(eventId, formData);
      setSuccess('Successfully registered for the event! Check your email for the ticket.');
      setShowRegistrationForm(false);
      setIsRegistered(true);

      setTimeout(() => {
        fetchEvent();
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };


  const computeTotal = () => {
    if (!event?.merchandiseItems) return 0;
    let total = 0;
    Object.entries(merchandiseData).forEach(([itemId, data]) => {
      const qty = parseInt(data.quantity) || 0;
      if (qty > 0) {
        const item = event.merchandiseItems.find(i => i._id === itemId);
        if (item) {
          total += (item.basePrice || 0) * qty;
        }
      }
    });
    return total;
  };

  const handleMerchandisePurchase = async () => {
    try {
      setError('');
      setSuccess('');
      setRegistering(true);


      const items = Object.entries(merchandiseData).map(([itemId, data]) => ({
        itemId,
        quantity: parseInt(data.quantity) || 0,
        size: data.size || '',
        color: data.color || ''
      })).filter(item => item.quantity > 0);

      if (items.length === 0) {
        setError('Please select at least one item');
        setRegistering(false);
        return;
      }

      const response = await registrationAPI.purchaseMerchandise(eventId, items);

      const regs = response.registrations || [];
      setPendingOrders(regs);
      setSuccess('Order placed! Total: ₹' + (response.totalAmount || 0) + '. Please upload payment proof below.');
      setShowRegistrationForm(false);

      setTimeout(() => {
        fetchEvent();
      }, 1500);
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message || 'Purchase failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleUploadPaymentProof = async (registrationId) => {
    if (!paymentProofFile) {
      setError('Please select a payment proof image');
      return;
    }

    try {
      setUploadingProof(true);
      setError('');


      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result;
          await registrationAPI.uploadPaymentProof(registrationId, base64);
          setSuccess('Payment proof uploaded! Your order is under review.');
          setShowPaymentProof(null);
          setPaymentProofFile(null);
          setPendingOrders(prev => prev.map(o =>
            o._id === registrationId ? { ...o, paymentProofUrl: base64, status: 'PENDING' } : o
          ));
        } catch (err) {
          setError(err.message || 'Failed to upload payment proof');
        } finally {
          setUploadingProof(false);
        }
      };
      reader.readAsDataURL(paymentProofFile);
    } catch (err) {
      setError(err.message || 'Failed to upload payment proof');
      setUploadingProof(false);
    }
  };

  if (loading) return (
    <div className="event-details-container">
      <nav className="event-details-nav">
        <div className="nav-actions"><button className="nav-item" onClick={onBack}>← Back</button></div>
        <div className="nav-brand">Felicity</div>
      </nav>
      <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>Loading event details...</p>
    </div>
  );
  if (!event) return (
    <div className="event-details-container">
      <nav className="event-details-nav">
        <div className="nav-actions"><button className="nav-item" onClick={onBack}>← Back</button></div>
        <div className="nav-brand">Felicity</div>
      </nav>
      <div style={{ color: '#ff9999', textAlign: 'center', padding: '60px 20px' }}>
        <h2>Event not found</h2>
        {error && <p>{error}</p>}
        <button className="nav-item" onClick={onBack} style={{ marginTop: '20px' }}>← Go Back</button>
      </div>
    </div>
  );

  const registrationDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : new Date(0);
  const isRegistrationOpen = new Date() < registrationDeadline;
  const spotsAvailable = Math.max(0, (event.registrationLimit || 0) - (event.registrationCount || 0));
  const hasStock = event.type === 'MERCHANDISE'
    ? event.merchandiseItems?.some(item => (item.stock || 0) > 0)
    : true;
  const canRegister = isRegistrationOpen && (event.type === 'MERCHANDISE' ? hasStock : spotsAvailable > 0);

  return (
    <div className="event-details-container">
      <nav className="event-details-nav">
        <div className="nav-actions">
          <button className="nav-item" onClick={onBack}>← Back</button>
        </div>
        <div className="nav-brand">Felicity</div>
      </nav>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="event-details-header">
        <h1>{event.name}</h1>
        <p className={`event-status ${event.status}`}>{event.status}</p>
      </div>

      <div className="event-details-content">
        <div className="event-info">
          <section className="info-section">
            <h2>About this Event</h2>
            <p>{event.description}</p>
          </section>

          <section className="info-section">
            <h2>Event Details</h2>
            <div className="detail-item">
              <span className="label">Organizer:</span>
              <span className="value">{event.organizer?.organizerName}</span>
            </div>
            <div className="detail-item">
              <span className="label">Type:</span>
              <span className="value">{event.type}</span>
            </div>
            <div className="detail-item">
              <span className="label">Date:</span>
              <span className="value">
                {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Eligibility:</span>
              <span className="value">{event.eligibility}</span>
            </div>
            <div className="detail-item">
              <span className="label">Registration Fee:</span>
              <span className="value">{event.registrationFee ? `₹${event.registrationFee}` : 'Free'}</span>
            </div>
          </section>

          {event.type === 'MERCHANDISE' && event.merchandiseItems && event.merchandiseItems.length > 0 && (
            <section className="info-section">
              <h2>Merchandise Items</h2>
              {event.merchandiseItems.map((item) => (
                <div key={item._id} className="merchandise-item">
                  <h4>{item.name}</h4>
                  {item.description && <p>{item.description}</p>}
                  <div className="item-details">
                    <span>₹{item.basePrice || 0}</span>
                    <span>Stock: {item.stock || 0}</span>
                    {item.sizes && item.sizes.length > 0 && <span>Sizes: {item.sizes.join(', ')}</span>}
                    {item.colors && item.colors.length > 0 && <span>Colors: {item.colors.join(', ')}</span>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {event.type === 'NORMAL' && event.customFields && event.customFields.length > 0 && (
            <section className="info-section">
              <h2>Fields</h2>
              <p className="text-muted">These fields need to be filled during registration</p>
              {event.customFields.map((field) => (
                <div key={field.id} className="custom-field-info">
                  <span className="field-name">{field.name}</span>
                  <span className="field-type">{field.type}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="event-sidebar">
          <div className="registration-card">
            <h3>Registration Information</h3>
            <div className="info-item">
              <span>Registration Deadline:</span>
              <span>{registrationDeadline.toLocaleString()}</span>
            </div>
            {event.type !== 'MERCHANDISE' && (
              <div className="info-item">
                <span>Spots Available:</span>
                <span>{spotsAvailable}</span>
              </div>
            )}

            {!isRegistrationOpen && (
              <div className="alert alert-error">Registration deadline has passed</div>
            )}
            {event.type !== 'MERCHANDISE' && spotsAvailable === 0 && isRegistrationOpen && (
              <div className="alert alert-error">No spots available</div>
            )}
            {event.type === 'MERCHANDISE' && !hasStock && isRegistrationOpen && (
              <div className="alert alert-error">All items are out of stock</div>
            )}

            {isRegistered ? (
              <button className="register-btn" disabled style={{ background: '#4caf50', cursor: 'default' }}>
                Registered
              </button>
            ) : canRegister ? (
              <button
                className="register-btn"
                onClick={() => setShowRegistrationForm(true)}
                disabled={registering}
              >
                {event.type === 'MERCHANDISE' ? 'Purchase Now' : 'Register Now'}
              </button>
            ) : (
              <button className="register-btn disabled" disabled>
                {!isRegistrationOpen ? 'Registration Closed' : 'Sold Out'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Registration Form Modal */}
      {showRegistrationForm && (
        <div className="modal-overlay" onClick={() => setShowRegistrationForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{event.type === 'MERCHANDISE' ? 'Purchase Items' : 'Register for Event'}</h2>
              <button className="close-btn" onClick={() => setShowRegistrationForm(false)}>×</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="modal-body">
              {event.type === 'NORMAL' && event.customFields && event.customFields.length > 0 && (
                <form className="registration-form">
                  <h4>Fill in the required information</h4>
                  {event.customFields.map((field) => (
                    <div key={field.id} className="form-group">
                      <label>
                        {field.name}
                        {field.required && <span className="required">*</span>}
                      </label>

                      {field.type === 'textarea' && (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFormInputChange(field.name, e.target.value)}
                          required={field.required}
                          placeholder={`Enter ${field.name.toLowerCase()}`}
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFormInputChange(field.name, e.target.value)}
                          required={field.required}
                        >
                          <option value="">Select {field.name.toLowerCase()}</option>
                          {field.options && field.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      )}

                      {field.type === 'checkbox' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData[field.name] === 'true' || formData[field.name] === true}
                            onChange={(e) => handleFormInputChange(field.name, e.target.checked.toString())}
                          />
                          <span>{field.name}</span>
                        </label>
                      )}

                      {field.type === 'file' && (
                        <>
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {

                                if (file.size > 5 * 1024 * 1024) {
                                  setError(`File "${file.name}" is too large. Maximum size is 5MB.`);
                                  e.target.value = '';
                                  return;
                                }

                                const reader = new FileReader();
                                reader.onload = () => {
                                  handleFormInputChange(field.name, reader.result);
                                };
                                reader.readAsDataURL(file);
                              } else {
                                handleFormInputChange(field.name, '');
                              }
                            }}
                            required={field.required}
                          />
                          <small style={{ color: '#888', fontSize: '11px' }}>Max file size: 5MB</small>
                          {formData[field.name] && formData[field.name].startsWith('data:image') && (
                            <img src={formData[field.name]} alt="Preview" style={{ maxWidth: '200px', marginTop: '8px', borderRadius: '4px' }} />
                          )}
                        </>
                      )}

                      {!['textarea', 'select', 'checkbox', 'file'].includes(field.type) && (
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFormInputChange(field.name, e.target.value)}
                          required={field.required}
                          placeholder={`Enter ${field.name.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </form>
              )}

              {event.type === 'MERCHANDISE' && event.merchandiseItems && event.merchandiseItems.length > 0 && (
                <form className="merchandise-form">
                  <h4>Select items to purchase</h4>
                  {event.merchandiseItems.map((item) => (
                    <div key={item._id} className="merchandise-section">
                      <h5>{item.name}</h5>
                      <div className="merchandise-inputs">
                        <div className="form-group">
                          <label>Quantity (max {item.maxPerPerson})</label>
                          <input
                            type="number"
                            min="0"
                            max={item.maxPerPerson}
                            value={merchandiseData[item._id]?.quantity || 0}
                            onChange={(e) => handleMerchandiseChange(item._id, 'quantity', e.target.value)}
                          />
                        </div>

                        {item.sizes && item.sizes.length > 0 && (
                          <div className="form-group">
                            <label>Size</label>
                            <select
                              value={merchandiseData[item._id]?.size || ''}
                              onChange={(e) => handleMerchandiseChange(item._id, 'size', e.target.value)}
                            >
                              <option value="">Select size</option>
                              {item.sizes.map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {item.colors && item.colors.length > 0 && (
                          <div className="form-group">
                            <label>Color</label>
                            <select
                              value={merchandiseData[item._id]?.color || ''}
                              onChange={(e) => handleMerchandiseChange(item._id, 'color', e.target.value)}
                            >
                              <option value="">Select color</option>
                              {item.colors.map((color) => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="item-details" style={{ marginTop: '8px' }}>
                        <span>₹{item.basePrice || 0} each</span>
                        <span>Stock: {item.stock || 0}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(217,104,58,0.1)', borderRadius: '8px', textAlign: 'right' }}>
                    <strong style={{ color: '#d9683a', fontSize: '18px' }}>Total: ₹{computeTotal()}</strong>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowRegistrationForm(false)}>Cancel</button>
              <button
                className="primary-btn"
                onClick={event.type === 'MERCHANDISE' ? handleMerchandisePurchase : handleRegister}
                disabled={registering}
              >
                {registering ? 'Processing...' : (event.type === 'MERCHANDISE' ? 'Place Order' : 'Register')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Upload Section — shows after placing merchandise order */}
      {pendingOrders.length > 0 && (
        <div className="modal-overlay" onClick={() => setPendingOrders([])}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Payment Proof</h2>
              <button className="close-btn" onClick={() => setPendingOrders([])}>×</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="modal-body">
              <p style={{ color: '#ccc', marginBottom: '16px' }}>
                Your order has been placed. Upload a screenshot/photo of your payment to complete the purchase.
                The organizer will review and approve your order.
              </p>
              {pendingOrders.map(order => (
                <div key={order._id} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#ddd' }}>{order.merchandiseSelection?.itemName || 'Item'} ×{order.merchandiseSelection?.quantity || 1}</span>
                    <span style={{ color: '#d9683a', fontWeight: 'bold' }}>₹{order.amountPaid || 0}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: order.paymentProofUrl ? '#4caf50' : '#ffa726', padding: '2px 8px', borderRadius: '4px', background: order.paymentProofUrl ? 'rgba(76,175,80,0.1)' : 'rgba(255,167,38,0.1)' }}>
                    {order.paymentProofUrl ? 'Proof Uploaded' : 'Awaiting Proof'}
                  </span>
                  {!order.paymentProofUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPaymentProofFile(e.target.files[0])}
                        style={{ marginBottom: '8px', fontSize: '13px' }}
                      />
                      <button
                        className="primary-btn"
                        style={{ fontSize: '13px', padding: '6px 16px' }}
                        onClick={() => handleUploadPaymentProof(order._id)}
                        disabled={uploadingProof || !paymentProofFile}
                      >
                        {uploadingProof ? 'Uploading...' : 'Upload Proof'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setPendingOrders([])}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Discussion Forum — visible to registered participants and the organizer */}
      {event && user && (isOrganizerView || user?.role === 'organizer' || isRegistered) && (
        <div className="event-details-content" style={{ marginTop: 0 }}>
          <div className="event-info" style={{ maxWidth: '100%' }}>
            <ForumSection
              eventId={eventId}
              isOrganizer={isOrganizerView || user?.role === 'organizer'}
            />
          </div>
        </div>
      )}
      {event && user && user.role === 'participant' && !isRegistered && (
        <div className="event-details-content" style={{ marginTop: 0 }}>
          <div className="event-info" style={{ maxWidth: '100%', padding: '24px', textAlign: 'center', color: '#888' }}>
            <p>💬 Discussion forum is available after registration</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
