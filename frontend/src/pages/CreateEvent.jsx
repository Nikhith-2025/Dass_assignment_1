import { useState } from 'react';
import { eventAPI } from '../api/apiClient';
import { INTEREST_OPTIONS } from '../constants/interests';
import '../styles/CreateEvent.css';

const INITIAL_FORM = {
  name: '',
  description: '',
  type: 'NORMAL',
  eligibility: 'Everyone',
  registrationDeadline: '',
  startDate: '',
  endDate: '',
  registrationLimit: 100,
  registrationFee: 0,
  tags: '',
  venue: '',
  isOnline: false,
  category: '',
  customFields: [],
  merchandiseItems: []
};

const EVENT_TYPES = [
  { value: 'NORMAL', label: 'Normal Event' },
  { value: 'MERCHANDISE', label: 'Merchandise Sale' }
];

const ELIGIBILITY_OPTIONS = [
  { value: 'Everyone', label: 'Everyone' },
  { value: 'IIIT', label: 'IIIT Students Only' },
  { value: 'NON_IIIT', label: 'Non-IIIT Participants' }
];

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' }
];

function CreateEvent({ onBack, onCreated }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newField, setNewField] = useState({ name: '', type: 'text', required: true, options: '' });
  const [newMerch, setNewMerch] = useState({ name: '', description: '', basePrice: '', stock: '', sizes: '', colors: '', maxPerPerson: '' });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };

      if (name === 'type' && value === 'MERCHANDISE') {
        updated.registrationFee = 0;
      }
      return updated;
    });
  };

  const addCustomField = () => {
    if (!newField.name.trim()) {
      setError('Field name is required');
      return;
    }
    const field = {
      ...newField,
      id: Date.now(),
      options: newField.type === 'select' ? newField.options.split(',').map(o => o.trim()).filter(Boolean) : []
    };
    setFormData(prev => ({
      ...prev,
      customFields: [...prev.customFields, field]
    }));
    setNewField({ name: '', type: 'text', required: true, options: '' });
    setError('');
  };

  const removeCustomField = (id) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.id !== id)
    }));
  };

  const addMerchandiseItem = () => {
    if (!newMerch.name.trim() || !newMerch.basePrice || !newMerch.maxPerPerson || !newMerch.stock) {
      setError('Item name, price, stock, and purchase limit are required');
      return;
    }
    const item = {
      ...newMerch,
      id: Date.now(),
      basePrice: parseFloat(newMerch.basePrice),
      stock: parseInt(newMerch.stock),
      maxPerPerson: parseInt(newMerch.maxPerPerson),
      sizes: newMerch.sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: newMerch.colors.split(',').map(c => c.trim()).filter(Boolean)
    };
    setFormData(prev => ({
      ...prev,
      merchandiseItems: [...prev.merchandiseItems, item]
    }));
    setNewMerch({ name: '', description: '', basePrice: '', stock: '', sizes: '', colors: '', maxPerPerson: '' });
    setError('');
  };

  const removeMerchandiseItem = (id) => {
    setFormData(prev => ({
      ...prev,
      merchandiseItems: prev.merchandiseItems.filter(m => m.id !== id)
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Event name is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Event description is required');
      return false;
    }
    if (!formData.startDate) {
      setError('Start date is required');
      return false;
    }
    if (!formData.endDate) {
      setError('End date is required');
      return false;
    }
    if (!formData.registrationDeadline) {
      setError('Registration deadline is required');
      return false;
    }
    if (new Date(formData.registrationDeadline) > new Date(formData.startDate)) {
      setError('Registration deadline must be before event start date');
      return false;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date');
      return false;
    }
    if (formData.type === 'MERCHANDISE' && formData.merchandiseItems.length === 0) {
      setError('Merchandise event must have at least one item');
      return false;
    }
    if (formData.type !== 'MERCHANDISE' && formData.registrationLimit <= 0) {
      setError('Registration limit must be greater than 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        eligibility: formData.eligibility,
        registrationDeadline: new Date(formData.registrationDeadline).toISOString(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        registrationLimit: formData.type === 'MERCHANDISE' ? 99999 : Number(formData.registrationLimit),
        registrationFee: formData.type === 'MERCHANDISE' ? 0 : (Number(formData.registrationFee) || 0),
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        venue: formData.venue.trim(),
        isOnline: formData.isOnline,
        category: formData.category || undefined,
        customFields: formData.type === 'NORMAL' ? formData.customFields : undefined,
        merchandiseItems: formData.type === 'MERCHANDISE' ? formData.merchandiseItems : undefined
      };

      const response = await eventAPI.createEvent(payload);
      setSuccess('Event created successfully!');
      setFormData(INITIAL_FORM);
      setTimeout(() => {
        if (onCreated) onCreated();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-event-container">
      <div className="create-event-card">
        <div className="create-event-header">
          <div className="header-content">
            <h1>Create New Event</h1>
            <p>Organize and publish an event for your community</p>
          </div>
          <button className="nav-back-btn" onClick={onBack}>← Back</button>
        </div>

        {error && <div className="form-error alert-error">{error}</div>}
        {success && <div className="form-success alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="create-event-form">
          {/* Basic Information Section */}
          <fieldset className="form-section">
            <legend>Basic Information</legend>

            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="name">Event Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Tech Workshop 2024"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your event in detail..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Event Type *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="eligibility">Eligibility *</label>
                <select
                  id="eligibility"
                  name="eligibility"
                  value={formData.eligibility}
                  onChange={handleChange}
                  required
                >
                  {ELIGIBILITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="">Select a category</option>
                  {INTEREST_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Event Details Section */}
          <fieldset className="form-section">
            <legend>Event Details</legend>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="startDate">Start Date & Time *</label>
                <input
                  id="startDate"
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">End Date & Time *</label>
                <input
                  id="endDate"
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="registrationDeadline">Registration Deadline *</label>
                <input
                  id="registrationDeadline"
                  type="datetime-local"
                  name="registrationDeadline"
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="venue">Venue</label>
                <input
                  id="venue"
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="e.g., IIIT Campus, Room 101"
                />
              </div>
            </div>
          </fieldset>

          {/* Registration Settings Section */}
          <fieldset className="form-section">
            <legend>Registration Settings</legend>

            <div className="form-grid">
              {formData.type !== 'MERCHANDISE' && (
                <div className="form-group">
                  <label htmlFor="registrationLimit">Registration Limit *</label>
                  <input
                    id="registrationLimit"
                    type="number"
                    name="registrationLimit"
                    min="1"
                    value={formData.registrationLimit}
                    onChange={handleChange}
                    required
                  />
                  <small>Number of participants allowed</small>
                </div>
              )}

              {formData.type !== 'MERCHANDISE' && (
                <div className="form-group">
                  <label htmlFor="registrationFee">Registration Fee (₹)</label>
                  <input
                    id="registrationFee"
                    type="number"
                    name="registrationFee"
                    min="0"
                    step="0.01"
                    value={formData.registrationFee}
                    onChange={handleChange}
                  />
                </div>
              )}
            </div>
          </fieldset>

          {/* Additional Information Section */}
          <fieldset className="form-section">
            <legend>Additional Information</legend>

            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  id="tags"
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g., workshop, tech, beginners"
                />
              </div>
            </div>
          </fieldset>

          {/* Dynamic Form Builder for Normal Events */}
          {formData.type === 'NORMAL' && (
            <fieldset className="form-section">
              <legend>Custom Registration Fields</legend>
              <p className="section-help">Add custom fields for participants to fill during registration</p>

              <div className="form-builder">
                {formData.customFields.length > 0 && (
                  <div className="fields-list">
                    {formData.customFields.map((field) => (
                      <div key={field.id} className="field-item">
                        <div className="field-info">
                          <strong>{field.name}</strong>
                          <span className="field-type">{field.type}</span>
                          {field.required && <span className="field-required">Required</span>}
                        </div>
                        <button type="button" className="remove-btn" onClick={() => removeCustomField(field.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="add-field-form">
                  <h4>Add New Field</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Field Name</label>
                      <input
                        type="text"
                        value={newField.name}
                        onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                        placeholder="e.g., Team Name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Field Type</label>
                      <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value })}>
                        {FIELD_TYPES.map(ft => (
                          <option key={ft.value} value={ft.value}>{ft.label}</option>
                        ))}
                      </select>
                    </div>
                    {newField.type === 'select' && (
                      <div className="form-group full-width">
                        <label>Options (comma-separated)</label>
                        <input
                          type="text"
                          value={newField.options}
                          onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                          placeholder="e.g., Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={newField.required}
                          onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                        />
                        <span>Required Field</span>
                      </label>
                    </div>
                  </div>
                  <button type="button" className="primary-btn" onClick={addCustomField}>Add Field</button>
                </div>
              </div>
            </fieldset>
          )}

          {/* Dynamic Form Builder for Merchandise */}
          {formData.type === 'MERCHANDISE' && (
            <fieldset className="form-section">
              <legend>Merchandise Items</legend>
              <p className="section-help">Add items for sale with sizes, colors, and stock details</p>

              <div className="form-builder">
                {formData.merchandiseItems.length > 0 && (
                  <div className="items-list">
                    {formData.merchandiseItems.map((item) => (
                      <div key={item.id} className="item-card">
                        <div className="item-details">
                          <h4>{item.name}</h4>
                          {item.description && <p>{item.description}</p>}
                          <div className="item-specs">
                            <span>₹{item.basePrice}</span>
                            <span>Stock: {item.stock}</span>
                            {item.sizes.length > 0 && <span>Sizes: {item.sizes.join(', ')}</span>}
                            {item.colors.length > 0 && <span>Colors: {item.colors.join(', ')}</span>}
                            <span>Max: {item.maxPerPerson} per person</span>
                          </div>
                        </div>
                        <button type="button" className="remove-btn" onClick={() => removeMerchandiseItem(item.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="add-item-form">
                  <h4>Add New Item</h4>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Item Name</label>
                      <input
                        type="text"
                        value={newMerch.name}
                        onChange={(e) => setNewMerch({ ...newMerch, name: e.target.value })}
                        placeholder="e.g., T-Shirt"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Description</label>
                      <input
                        type="text"
                        value={newMerch.description}
                        onChange={(e) => setNewMerch({ ...newMerch, description: e.target.value })}
                        placeholder="Optional item description"
                      />
                    </div>
                    <div className="form-group">
                      <label>Base Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newMerch.basePrice}
                        onChange={(e) => setNewMerch({ ...newMerch, basePrice: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Per Person</label>
                      <input
                        type="number"
                        min="1"
                        value={newMerch.maxPerPerson}
                        onChange={(e) => setNewMerch({ ...newMerch, maxPerPerson: e.target.value })}
                        placeholder="5"
                      />
                    </div>
                    <div className="form-group">
                      <label>Total Stock *</label>
                      <input
                        type="number"
                        min="1"
                        value={newMerch.stock}
                        onChange={(e) => setNewMerch({ ...newMerch, stock: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Sizes (comma-separated)</label>
                      <input
                        type="text"
                        value={newMerch.sizes}
                        onChange={(e) => setNewMerch({ ...newMerch, sizes: e.target.value })}
                        placeholder="e.g., XS, S, M, L, XL, XXL"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Colors (comma-separated)</label>
                      <input
                        type="text"
                        value={newMerch.colors}
                        onChange={(e) => setNewMerch({ ...newMerch, colors: e.target.value })}
                        placeholder="e.g., Red, Blue, Green"
                      />
                    </div>
                  </div>
                  <button type="button" className="primary-btn" onClick={addMerchandiseItem}>Add Item</button>
                </div>
              </div>
            </fieldset>
          )}

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onBack}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving ? 'Creating Event...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateEvent;
