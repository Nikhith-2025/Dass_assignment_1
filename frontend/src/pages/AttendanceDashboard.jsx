import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { registrationAPI } from '../api/apiClient';
import '../styles/AttendanceDashboard.css';

function AttendanceDashboard({ eventId, onBack }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState('');
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState('scanner');
    const [manualOverride, setManualOverride] = useState({ id: null, reason: '' });
    const scannerRef = useRef(null);
    const html5QrRef = useRef(null);

    useEffect(() => {
        fetchStats();
        return () => {
            stopScanner();
        };
    }, [eventId]);

    const fetchStats = async () => {
        try {
            const data = await registrationAPI.getAttendanceStats(eventId);
            setStats(data);
        } catch (err) {
            console.error('Error fetching attendance stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const startScanner = async () => {
        try {
            setScanResult(null);
            setScanError('');
            setScanning(true);

            const html5Qr = new Html5Qrcode("qr-reader");
            html5QrRef.current = html5Qr;

            await html5Qr.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {

                    await html5Qr.stop();
                    html5QrRef.current = null;
                    setScanning(false);
                    handleScan(decodedText);
                },
                () => { } // ignore errors during scanning
            );
        } catch (err) {
            console.error('Camera error:', err);
            setScanError('Could not access camera. Try uploading a QR image instead.');
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrRef.current) {
            try {
                await html5QrRef.current.stop();
            } catch (e) { /* ignore */ }
            html5QrRef.current = null;
        }
        setScanning(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setScanResult(null);
            setScanError('');
            const html5Qr = new Html5Qrcode("qr-reader-file");
            const result = await html5Qr.scanFile(file, true);
            handleScan(result);
        } catch (err) {
            setScanError('Could not read QR code from image. Make sure the image is clear.');
        }
    };

    const handleScan = async (ticketId) => {
        try {
            setScanError('');
            const result = await registrationAPI.scanQR(ticketId);
            setScanResult({ success: true, ...result });

            fetchStats();
        } catch (err) {
            const msg = err.message || 'Scan failed';
            if (msg.includes('Duplicate')) {
                setScanResult({ success: false, duplicate: true, message: msg });
            } else {
                setScanError(msg);
            }
        }
    };

    const handleManualOverride = async (registrationId, attended) => {
        const reason = manualOverride.reason || (attended ? 'Manual check-in by organizer' : 'Manual unmark by organizer');
        try {
            await registrationAPI.markAttendance(registrationId, attended, reason);
            setManualOverride({ id: null, reason: '' });
            fetchStats();
        } catch (err) {
            alert('Failed: ' + err.message);
        }
    };

    const handleExportCSV = async () => {
        try {
            await registrationAPI.exportAttendanceCSV(eventId);
        } catch (err) {
            alert('Export failed: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="attendance-container">
                <nav className="attendance-nav">
                    <button className="nav-back" onClick={onBack}>← Back</button>
                    <span className="nav-title">Attendance Dashboard</span>
                </nav>
                <p className="loading-text">Loading attendance data...</p>
            </div>
        );
    }

    return (
        <div className="attendance-container">
            <nav className="attendance-nav">
                <button className="nav-back" onClick={onBack}>← Back</button>
                <span className="nav-title">Attendance Dashboard</span>
                <button className="export-btn" onClick={handleExportCSV}>Export CSV</button>
            </nav>

            {/* Live Stats Bar */}
            {stats && (
                <div className="stats-bar">
                    <div className="stat-card">
                        <span className="stat-number">{stats.total}</span>
                        <span className="stat-label">Total Registered</span>
                    </div>
                    <div className="stat-card scanned">
                        <span className="stat-number">{stats.scanned}</span>
                        <span className="stat-label">Checked In</span>
                    </div>
                    <div className="stat-card not-scanned">
                        <span className="stat-number">{stats.notScanned}</span>
                        <span className="stat-label">Not Yet Scanned</span>
                    </div>
                    <div className="stat-card percentage">
                        <span className="stat-number">
                            {stats.total > 0 ? Math.round((stats.scanned / stats.total) * 100) : 0}%
                        </span>
                        <span className="stat-label">Attendance Rate</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="attendance-tabs">
                <button className={`att-tab ${activeTab === 'scanner' ? 'active' : ''}`} onClick={() => { setActiveTab('scanner'); stopScanner(); }}>
                    QR Scanner
                </button>
                <button className={`att-tab ${activeTab === 'scanned' ? 'active' : ''}`} onClick={() => { setActiveTab('scanned'); stopScanner(); }}>
                    Checked In ({stats?.scanned || 0})
                </button>
                <button className={`att-tab ${activeTab === 'not-scanned' ? 'active' : ''}`} onClick={() => { setActiveTab('not-scanned'); stopScanner(); }}>
                    Not Scanned ({stats?.notScanned || 0})
                </button>
            </div>

            {/* Scanner Tab */}
            {activeTab === 'scanner' && (
                <div className="scanner-section">
                    <div className="scanner-controls">
                        {!scanning ? (
                            <button className="scan-btn" onClick={startScanner}>Start Camera Scanner</button>
                        ) : (
                            <button className="scan-btn stop" onClick={stopScanner}>Stop Scanner</button>
                        )}

                        <div className="file-upload-section">
                            <label className="file-upload-label">
                                Or upload QR image:
                                <input type="file" accept="image/*" onChange={handleFileUpload} />
                            </label>
                        </div>
                    </div>

                    <div id="qr-reader" className="qr-reader-box"></div>
                    <div id="qr-reader-file" style={{ display: 'none' }}></div>

                    {/* Scan Result */}
                    {scanResult && (
                        <div className={`scan-result ${scanResult.success ? 'success' : 'warning'}`}>
                            {scanResult.success ? (
                                <>
                                    <div className="result-icon">Done</div>
                                    <h3>Attendance Marked!</h3>
                                    <p><strong>{scanResult.participant?.name}</strong></p>
                                    <p>{scanResult.participant?.email}</p>
                                    <p className="ticket-info">Ticket: {scanResult.ticketId}</p>
                                </>
                            ) : scanResult.duplicate ? (
                                <>
                                    <div className="result-icon duplicate">⚠</div>
                                    <h3>Duplicate Scan</h3>
                                    <p>{scanResult.message}</p>
                                </>
                            ) : (
                                <>
                                    <div className="result-icon error">✗</div>
                                    <h3>Scan Failed</h3>
                                    <p>{scanResult.message}</p>
                                </>
                            )}
                        </div>
                    )}

                    {scanError && (
                        <div className="scan-result error">
                            <div className="result-icon error">✗</div>
                            <p>{scanError}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Checked In Tab */}
            {activeTab === 'scanned' && (
                <div className="participants-list">
                    {stats?.scannedParticipants?.length === 0 ? (
                        <p className="empty-state">No participants checked in yet.</p>
                    ) : (
                        stats?.scannedParticipants?.map(p => (
                            <div key={p.registrationId} className="participant-row">
                                <div className="participant-info">
                                    <strong>{p.name}</strong>
                                    <span>{p.email}</span>
                                    <span className="ticket-id">Ticket: {p.ticketId}</span>
                                </div>
                                <div className="participant-status">
                                    <span className="badge present">Present</span>
                                    <span className="attended-time">{new Date(p.attendedAt).toLocaleTimeString()}</span>
                                    {/* Manual override: unmark */}
                                    {manualOverride.id === p.registrationId ? (
                                        <div className="override-form">
                                            <input
                                                type="text"
                                                placeholder="Reason for override"
                                                value={manualOverride.reason}
                                                onChange={e => setManualOverride({ ...manualOverride, reason: e.target.value })}
                                            />
                                            <button className="override-confirm" onClick={() => handleManualOverride(p.registrationId, false)}>Unmark</button>
                                            <button className="override-cancel" onClick={() => setManualOverride({ id: null, reason: '' })}>Cancel</button>
                                        </div>
                                    ) : (
                                        <button className="override-btn" onClick={() => setManualOverride({ id: p.registrationId, reason: '' })} title="Manual override">Override</button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Not Scanned Tab */}
            {activeTab === 'not-scanned' && (
                <div className="participants-list">
                    {stats?.notScannedParticipants?.length === 0 ? (
                        <p className="empty-state">All participants have been checked in! 🎉</p>
                    ) : (
                        stats?.notScannedParticipants?.map(p => (
                            <div key={p.registrationId} className="participant-row">
                                <div className="participant-info">
                                    <strong>{p.name}</strong>
                                    <span>{p.email}</span>
                                    <span className="ticket-id">Ticket: {p.ticketId || 'N/A'}</span>
                                </div>
                                <div className="participant-status">
                                    <span className="badge absent">Absent</span>
                                    {/* Manual override: mark present */}
                                    {manualOverride.id === p.registrationId ? (
                                        <div className="override-form">
                                            <input
                                                type="text"
                                                placeholder="Reason (e.g., lost QR)"
                                                value={manualOverride.reason}
                                                onChange={e => setManualOverride({ ...manualOverride, reason: e.target.value })}
                                            />
                                            <button className="override-confirm" onClick={() => handleManualOverride(p.registrationId, true)}>Mark Present</button>
                                            <button className="override-cancel" onClick={() => setManualOverride({ id: null, reason: '' })}>Cancel</button>
                                        </div>
                                    ) : (
                                        <button className="override-btn" onClick={() => setManualOverride({ id: p.registrationId, reason: '' })} title="Manual check-in">Manual Check-In</button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default AttendanceDashboard;
