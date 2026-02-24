const Notification = require("../models/notification");

// Get all notifications for the current user
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ user: userId })
            .populate("event", "name")
            .populate("triggeredBy", "firstName lastName")
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ user: userId, read: false });

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { read: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.json({ message: "Marked as read", notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark all notifications as read
exports.markAllRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
