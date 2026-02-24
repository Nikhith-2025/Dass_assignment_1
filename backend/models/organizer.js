const mongoose = require("mongoose");

const organizerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    organizerName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        "CLUB",
        "COUNCIL",
        "FEST_TEAM",
      ]
    },
    description: {
      type: String,
      required: true
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    contactNumber: {
      type: String
    },

    discordWebhookUrl: {
      type: String
    },

    isActive: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrganizerProfile", organizerProfileSchema);