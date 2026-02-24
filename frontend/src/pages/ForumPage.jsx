import React from 'react';
import ForumSection from '../components/ForumSection';
import '../styles/EventDetails.css';

const ForumPage = ({ eventId, eventName, onBack }) => {
    return (
        <div className="event-details-container">
            <nav className="event-details-nav">
                <div className="nav-actions">
                    <button className="nav-item" onClick={onBack}>← Back</button>
                </div>
                <div className="nav-brand">Felicity</div>
            </nav>

            <div className="event-details-header">
                <h1>{eventName || 'Discussion Forum'}</h1>
                <p className="event-status PUBLISHED">Forum</p>
            </div>

            <div className="event-details-content" style={{ marginTop: 0 }}>
                <div className="event-info" style={{ maxWidth: '100%' }}>
                    <ForumSection
                        eventId={eventId}
                        isOrganizer={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default ForumPage;
