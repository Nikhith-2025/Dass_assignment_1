const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema({
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizerProfile",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
    },
    adminComment: {
        type: String,
        default: ""
    },
    generatedPassword: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
