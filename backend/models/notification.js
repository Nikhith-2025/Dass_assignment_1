const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["MENTION", "EVERYONE", "ANNOUNCEMENT"],
            default: "MENTION"
        },
        message: {
            type: String,
            required: true,
            maxlength: 500
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event"
        },
        forumMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ForumMessage"
        },
        triggeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        read: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
