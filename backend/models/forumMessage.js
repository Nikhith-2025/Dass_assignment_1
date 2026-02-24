const mongoose = require("mongoose");

const forumMessageSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 2000
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ForumMessage",
            default: null
        },
        isPinned: {
            type: Boolean,
            default: false
        },
        isAnnouncement: {
            type: Boolean,
            default: false
        },
        reactions: {
            type: Map,
            of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            default: {}
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        deletedAt: Date
    },
    { timestamps: true }
);

forumMessageSchema.index({ event: 1, createdAt: -1 });
forumMessageSchema.index({ event: 1, parentId: 1 });
forumMessageSchema.index({ event: 1, isPinned: -1 });

module.exports = mongoose.model("ForumMessage", forumMessageSchema);
