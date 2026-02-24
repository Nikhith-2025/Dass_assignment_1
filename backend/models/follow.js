const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizerProfile",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Follow", followSchema);