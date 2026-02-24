const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["participant", "organizer", "admin"],
      required: true,
      immutable: true
    },


    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },


    firstName: {
      type: String,
      required: function () {
        return this.role === "participant";
      }
    },
    lastName: {
      type: String,
      required: function () {
        return this.role === "participant";
      }
    },


    participantType: {
      type: String,
      enum: ["IIIT", "NON_IIIT", "Non-IIIT"],
      required: function () {
        return this.role === "participant";
      }
    },


    collegeOrganizationName: {
      type: String,
      required: function () {
        return this.role === "participant";
      }
    },


    contactNumber: {
      type: String,
      required: function () {
        return this.role === "participant";
      }
    },


    interests: [
      {
        type: String,
        enum: [
          "Technology",
          "Design",
          "Management",
          "Arts",
          "Sports",
          "Music",
          "Business",
          "Science",
          "Coding",
          "Robotics",
          "Photography",
          "Entrepreneurship",
          "Other"
        ]
      }
    ],


    followedOrganizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizerProfile"
      }
    ],


    isActive: {
      type: Boolean,
      default: true
    },


    onboardingCompleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);