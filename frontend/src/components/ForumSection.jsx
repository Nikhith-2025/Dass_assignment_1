import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { forumAPI, registrationAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import '../styles/ForumSection.css';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function ForumSection({ eventId, isOrganizer }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(null);
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const textareaRef = useRef(null);

    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionSuggestions, setMentionSuggestions] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        fetchMessages();


        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-event', eventId);
        });

        socket.on('new-message', (message) => {
            setMessages(prev => {

                if (message.parentId) {
                    return prev.map(m => {
                        if (m._id === message.parentId.toString()) {
                            return { ...m, replies: [...(m.replies || []), message] };
                        }
                        return m;
                    });
                }

                return [{ ...message, replies: [] }, ...prev];
            });
        });

        socket.on('delete-message', ({ messageId }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId).map(m => ({
                ...m,
                replies: (m.replies || []).filter(r => r._id !== messageId)
            })));
        });

        socket.on('pin-message', ({ messageId, isPinned }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned } : m));
        });

        socket.on('reaction-update', ({ messageId, reactions }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === messageId) return { ...m, reactions };
                return {
                    ...m,
                    replies: (m.replies || []).map(r => r._id === messageId ? { ...r, reactions } : r)
                };
            }));
        });

        return () => {
            socket.emit('leave-event', eventId);
            socket.disconnect();
        };
    }, [eventId]);


    useEffect(() => {
        const fetchParticipants = async () => {
            try {

                const names = new Set();
                messages.forEach(msg => {
                    if (msg.user) names.add(`${msg.user.firstName} ${msg.user.lastName || ''}`.trim());
                    (msg.replies || []).forEach(r => {
                        if (r.user) names.add(`${r.user.firstName} ${r.user.lastName || ''}`.trim());
                    });
                });
                setParticipants([...names]);
            } catch (err) {
                console.error('Error building participant list:', err);
            }
        };
        fetchParticipants();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const data = await forumAPI.getMessages(eventId);
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Error loading forum messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        try {
            setSending(true);
            setError('');
            await forumAPI.postMessage(eventId, newMessage.trim(), replyTo, isAnnouncement);
            setNewMessage('');
            setReplyTo(null);
            setIsAnnouncement(false);
        } catch (err) {
            setError(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (messageId) => {
        if (!window.confirm('Delete this message?')) return;
        try {
            await forumAPI.deleteMessage(eventId, messageId);
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        }
    };

    const handlePin = async (messageId) => {
        try {
            await forumAPI.togglePin(eventId, messageId);
        } catch (err) {
            alert('Failed to pin: ' + err.message);
        }
    };

    const handleReact = async (messageId, emoji) => {
        try {
            await forumAPI.reactToMessage(eventId, messageId, emoji);
            setShowEmojiPicker(null);
        } catch (err) {
            console.error('Reaction failed:', err);
        }
    };

    const handleKeyPress = (e) => {
        if (showMentions && e.key === 'Escape') {
            setShowMentions(false);
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
            e.preventDefault();
            handleSend();
        }
    };


    const handleMessageChange = (e) => {
        const value = e.target.value;
        setNewMessage(value);


        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            const query = textBeforeCursor.slice(atIndex + 1);

            if (atIndex === 0 || /\s/.test(value[atIndex - 1])) {
                setMentionQuery(query);
                const allOptions = ['everyone', ...participants];
                const filtered = allOptions.filter(name =>
                    name.toLowerCase().startsWith(query.toLowerCase())
                );
                setMentionSuggestions(filtered.slice(0, 8));
                setShowMentions(query.length === 0 || filtered.length > 0);
                return;
            }
        }
        setShowMentions(false);
    };

    const insertMention = (name) => {
        const cursorPos = textareaRef.current?.selectionStart || newMessage.length;
        const textBeforeCursor = newMessage.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = newMessage.slice(cursorPos);
        const before = newMessage.slice(0, atIndex);
        const updated = `${before}@${name} ${textAfterCursor}`;
        setNewMessage(updated);
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const renderReactions = (msg) => {
        const reactions = msg.reactions || {};
        const entries = Object.entries(reactions);
        if (entries.length === 0) return null;

        return (
            <div className="reactions-bar">
                {entries.map(([emoji, users]) => (
                    <button
                        key={emoji}
                        className={`reaction-chip ${Array.isArray(users) && users.includes(user?._id) ? 'reacted' : ''}`}
                        onClick={() => handleReact(msg._id, emoji)}
                    >
                        {emoji} {Array.isArray(users) ? users.length : 0}
                    </button>
                ))}
            </div>
        );
    };

    const renderMessage = (msg, isReply = false) => {
        const isAuthor = msg.user?._id === user?._id;
        const userName = msg.user?.firstName
            ? `${msg.user.firstName} ${msg.user.lastName || ''}`
            : msg.user?.email || 'Unknown';
        const isOrgRole = msg.user?.role === 'organizer';

        return (
            <div key={msg._id} className={`forum-message ${isReply ? 'reply' : ''} ${msg.isPinned ? 'pinned' : ''} ${msg.isAnnouncement ? 'announcement' : ''}`}>
                <div className="message-header">
                    <div className="message-author">
                        <span className="author-name">{userName}</span>
                        {isOrgRole && <span className="org-badge">Organizer</span>}
                        {msg.isAnnouncement && <span className="ann-badge">📢 Announcement</span>}
                        {msg.isPinned && <span className="pin-badge">📌 Pinned</span>}
                    </div>
                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                </div>

                <div className="message-content">
                    {msg.content.split(/(@\w+(?:\s\w+)?)/g).map((part, i) =>
                        part.startsWith('@') ? (
                            <span key={i} style={{ color: '#d9683a', fontWeight: 600 }}>{part}</span>
                        ) : (
                            <span key={i}>{part}</span>
                        )
                    )}
                </div>

                {renderReactions(msg)}

                <div className="message-actions">
                    {!isReply && (
                        <button className="action-btn reply-btn" onClick={() => setReplyTo(msg._id)}>Reply</button>
                    )}
                    <button className="action-btn react-btn" onClick={() => setShowEmojiPicker(showEmojiPicker === msg._id ? null : msg._id)}>React</button>
                    {isOrganizer && !isReply && (
                        <button className="action-btn pin-btn" onClick={() => handlePin(msg._id)}>
                            {msg.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                    )}
                    {(isOrganizer || isAuthor) && (
                        <button className="action-btn delete-btn" onClick={() => handleDelete(msg._id)}>Delete</button>
                    )}
                </div>

                {showEmojiPicker === msg._id && (
                    <div className="emoji-picker">
                        {EMOJI_OPTIONS.map(emoji => (
                            <button key={emoji} className="emoji-btn" onClick={() => handleReact(msg._id, emoji)}>{emoji}</button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="forum-section"><p className="forum-loading">Loading discussion...</p></div>;
    }

    return (
        <div className="forum-section">
            <h2 className="forum-title">Discussion Forum</h2>

            {error && <div className="forum-error">{error}</div>}

            {/* Message Input */}
            <div className="forum-input-area">
                {replyTo && (
                    <div className="reply-indicator">
                        Replying to a message
                        <button onClick={() => setReplyTo(null)}>✕</button>
                    </div>
                )}
                <div className="input-row">
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleMessageChange}
                        onKeyDown={handleKeyPress}
                        placeholder={replyTo ? 'Write a reply... (use @ to mention)' : 'Write a message... (use @ to mention)'}
                        rows={2}
                        disabled={sending}
                    />
                    {/* @mention autocomplete dropdown */}
                    {showMentions && mentionSuggestions.length > 0 && (
                        <div className="mention-dropdown">
                            {mentionSuggestions.map((name, i) => (
                                <button
                                    key={i}
                                    className="mention-option"
                                    onClick={() => insertMention(name)}
                                >
                                    {name === 'everyone' ? '📢 @everyone' : `@${name}`}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="input-actions">
                        {isOrganizer && !replyTo && (
                            <label className="announcement-toggle">
                                <input
                                    type="checkbox"
                                    checked={isAnnouncement}
                                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                                />
                                <span>📢</span>
                            </label>
                        )}
                        <button className="send-btn" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                            {sending ? '...' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="forum-messages">
                {messages.length === 0 ? (
                    <p className="forum-empty">No messages yet. Start the discussion!</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg._id} className="message-thread">
                            {renderMessage(msg)}
                            {msg.replies && msg.replies.length > 0 && (
                                <div className="replies-container">
                                    {msg.replies.map(reply => renderMessage(reply, true))}
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}

export default ForumSection;
