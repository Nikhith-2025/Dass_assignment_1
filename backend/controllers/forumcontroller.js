const ForumMessage = require("../models/forumMessage");
const Registration = require("../models/registration");
const Event = require("../models/event");
const OrganizerProfile = require("../models/organizer");
const User = require("../models/user");
const Notification = require("../models/notification");

// Get messages for an event
exports.getMessages = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 50 } = req.query;


        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }


        const messages = await ForumMessage.find({
            event: eventId,
            parentId: null,
            isDeleted: false
        })
            .sort({ isPinned: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate("user", "firstName lastName email role");


        const messageIds = messages.map(m => m._id);
        const replies = await ForumMessage.find({
            parentId: { $in: messageIds },
            isDeleted: false
        })
            .sort({ createdAt: 1 })
            .populate("user", "firstName lastName email role");


        const threaded = messages.map(msg => {
            const msgObj = msg.toObject();
            msgObj.replies = replies.filter(
                r => r.parentId.toString() === msg._id.toString()
            );
            return msgObj;
        });

        const total = await ForumMessage.countDocuments({
            event: eventId,
            parentId: null,
            isDeleted: false
        });

        res.json({
            messages: threaded,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Get Forum Messages Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Post a message
exports.postMessage = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { content, parentId, isAnnouncement } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Message content is required" });
        }


        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }


        const organizer = await OrganizerProfile.findOne({ user: userId });
        const isOrganizer = organizer && event.organizer.equals(organizer._id);


        if (!isOrganizer) {
            const registration = await Registration.findOne({
                event: eventId,
                participant: userId,
                status: { $in: ["REGISTERED", "APPROVED", "COMPLETED"] }
            });
            if (!registration) {
                return res.status(403).json({
                    message: "Only registered participants and the organizer can post in this forum"
                });
            }
        }


        if (isAnnouncement && !isOrganizer) {
            return res.status(403).json({ message: "Only the organizer can post announcements" });
        }


        if (parentId) {
            const parent = await ForumMessage.findById(parentId);
            if (!parent || parent.event.toString() !== eventId) {
                return res.status(400).json({ message: "Invalid parent message" });
            }
        }

        const message = await ForumMessage.create({
            event: eventId,
            user: userId,
            content: content.trim(),
            parentId: parentId || null,
            isAnnouncement: isAnnouncement || false
        });

        const populated = await ForumMessage.findById(message._id)
            .populate("user", "firstName lastName email role");


        const io = req.app.get("io");
        if (io) {
            io.to(`event-${eventId}`).emit("new-message", populated);
        }


        let senderName = `${populated.user.firstName || ''} ${populated.user.lastName || ''}`.trim();
        if (!senderName) {
            const senderOrg = await OrganizerProfile.findOne({ user: userId });
            senderName = senderOrg?.organizerName || populated.user.email || 'Someone';
        }
        const msgContent = content.trim();


        const registrations = await Registration.find({
            event: eventId,
            status: { $in: ["REGISTERED", "APPROVED", "COMPLETED"] }
        }).populate("participant", "firstName lastName");

        const registeredUsers = registrations.map(r => ({
            id: r.participant._id.toString(),
            name: `${r.participant.firstName} ${r.participant.lastName}`
        }));

        let notifiedUserIds = new Set();


        if (msgContent.includes("@everyone")) {
            for (const ru of registeredUsers) {
                if (ru.id !== userId) {
                    notifiedUserIds.add(ru.id);
                }
            }

            const orgProfile = await OrganizerProfile.findOne({ _id: event.organizer });
            if (orgProfile && orgProfile.user.toString() !== userId) {
                notifiedUserIds.add(orgProfile.user.toString());
            }
        }


        const mentionRegex = /@([A-Za-z]+\s[A-Za-z]+)/g;
        let match;
        while ((match = mentionRegex.exec(msgContent)) !== null) {
            const mentionedName = match[1];
            if (mentionedName.toLowerCase() === 'everyone') continue;

            const matched = registeredUsers.find(
                ru => ru.name.toLowerCase() === mentionedName.toLowerCase()
            );
            if (matched && matched.id !== userId) {
                notifiedUserIds.add(matched.id);
            }

            const mentionOrgProfile = await OrganizerProfile.findOne({ _id: event.organizer });
            if (mentionOrgProfile) {
                if (mentionOrgProfile.organizerName?.toLowerCase() === mentionedName.toLowerCase() && mentionOrgProfile.user.toString() !== userId) {
                    notifiedUserIds.add(mentionOrgProfile.user.toString());
                }
            }
        }


        if (notifiedUserIds.size > 0) {
            const notifications = [];
            for (const uid of notifiedUserIds) {
                notifications.push({
                    user: uid,
                    type: msgContent.includes("@everyone") ? "EVERYONE" : "MENTION",
                    message: `${senderName} mentioned you in ${event.name} forum`,
                    event: eventId,
                    forumMessage: message._id,
                    triggeredBy: userId
                });
            }
            await Notification.insertMany(notifications);


            if (io) {
                for (const uid of notifiedUserIds) {
                    io.emit(`notification-${uid}`, {
                        type: msgContent.includes("@everyone") ? "EVERYONE" : "MENTION",
                        message: `${senderName} mentioned you in ${event.name} forum`,
                        eventId
                    });
                }
            }
        }

        res.status(201).json(populated);
    } catch (error) {
        console.error("Post Forum Message Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const userId = req.user.id;

        const message = await ForumMessage.findById(messageId);
        if (!message || message.event.toString() !== eventId) {
            return res.status(404).json({ message: "Message not found" });
        }


        const event = await Event.findById(eventId);
        const organizer = await OrganizerProfile.findOne({ user: userId });
        const isOrganizer = organizer && event.organizer.equals(organizer._id);
        const isAuthor = message.user.toString() === userId;

        if (!isOrganizer && !isAuthor) {
            return res.status(403).json({ message: "Not authorized to delete this message" });
        }


        message.isDeleted = true;
        message.deletedBy = userId;
        message.deletedAt = new Date();
        await message.save();


        if (!message.parentId) {
            await ForumMessage.updateMany(
                { parentId: messageId },
                { isDeleted: true, deletedBy: userId, deletedAt: new Date() }
            );
        }


        const io = req.app.get("io");
        if (io) {
            io.to(`event-${eventId}`).emit("delete-message", { messageId });
        }

        res.json({ message: "Message deleted successfully" });
    } catch (error) {
        console.error("Delete Forum Message Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Pin/unpin a message
exports.togglePin = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const userId = req.user.id;

        const event = await Event.findById(eventId);
        const organizer = await OrganizerProfile.findOne({ user: userId });
        if (!organizer || !event.organizer.equals(organizer._id)) {
            return res.status(403).json({ message: "Only the organizer can pin messages" });
        }

        const message = await ForumMessage.findById(messageId);
        if (!message || message.event.toString() !== eventId || message.isDeleted) {
            return res.status(404).json({ message: "Message not found" });
        }

        message.isPinned = !message.isPinned;
        await message.save();


        const io = req.app.get("io");
        if (io) {
            io.to(`event-${eventId}`).emit("pin-message", {
                messageId,
                isPinned: message.isPinned
            });
        }

        res.json({
            message: `Message ${message.isPinned ? "pinned" : "unpinned"} successfully`,
            isPinned: message.isPinned
        });
    } catch (error) {
        console.error("Toggle Pin Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// React to a message
exports.reactToMessage = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        if (!emoji) {
            return res.status(400).json({ message: "Emoji is required" });
        }

        const message = await ForumMessage.findById(messageId);
        if (!message || message.event.toString() !== eventId || message.isDeleted) {
            return res.status(404).json({ message: "Message not found" });
        }


        const existingReactions = message.reactions.get(emoji) || [];
        const userIndex = existingReactions.findIndex(
            id => id.toString() === userId
        );

        if (userIndex > -1) {
            existingReactions.splice(userIndex, 1);
        } else {
            existingReactions.push(userId);
        }

        if (existingReactions.length === 0) {
            message.reactions.delete(emoji);
        } else {
            message.reactions.set(emoji, existingReactions);
        }

        await message.save();


        const io = req.app.get("io");
        if (io) {
            io.to(`event-${eventId}`).emit("reaction-update", {
                messageId,
                reactions: Object.fromEntries(message.reactions)
            });
        }

        res.json({
            message: "Reaction updated",
            reactions: Object.fromEntries(message.reactions)
        });
    } catch (error) {
        console.error("React Error:", error);
        res.status(500).json({ message: error.message });
    }
};
