const User = require("../models/user");
const OrganizerProfile = require("../models/organizer");
const PasswordResetRequest = require("../models/passwordResetRequest");

// Get organizer profile
exports.getProfile = async (req, res) => {
  try {
    const organizerProfile = await OrganizerProfile.findOne({
      user: req.user.id
    }).populate("user", "email");

    if (!organizerProfile) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    res.json(organizerProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update organizer profile
exports.updateProfile = async (req, res) => {
  try {
    const { organizerName, category, description, contactEmail, contactNumber, discordWebhookUrl } = req.body;

    const organizerProfile = await OrganizerProfile.findOne({
      user: req.user.id
    });

    if (!organizerProfile) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }


    if (organizerName) organizerProfile.organizerName = organizerName;
    if (category) organizerProfile.category = category;
    if (description) organizerProfile.description = description;
    if (contactEmail) organizerProfile.contactEmail = contactEmail;
    if (contactNumber) organizerProfile.contactNumber = contactNumber;
    if (discordWebhookUrl) organizerProfile.discordWebhookUrl = discordWebhookUrl;

    await organizerProfile.save();

    res.json({
      message: "Profile updated successfully",
      organizer: organizerProfile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all organizers
exports.getAllOrganizers = async (req, res) => {
  try {
    const organizers = await OrganizerProfile.find({ isActive: true })
      .populate("user", "email")
      .select("-discordWebhookUrl");

    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single organizer details
exports.getOrganizerDetail = async (req, res) => {
  try {
    const organizer = await OrganizerProfile.findById(req.params.id)
      .populate("user", "email")
      .select("-discordWebhookUrl");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    res.json(organizer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: "Please provide a reason for the password reset request" });
    }

    const organizerProfile = await OrganizerProfile.findOne({ user: req.user.id });
    if (!organizerProfile) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }


    const existingPending = await PasswordResetRequest.findOne({
      user: req.user.id,
      status: "PENDING"
    });

    if (existingPending) {
      return res.status(400).json({ message: "You already have a pending password reset request" });
    }

    const request = await PasswordResetRequest.create({
      organizer: organizerProfile._id,
      user: req.user.id,
      reason: reason.trim()
    });

    res.status(201).json({
      message: "Password reset request submitted successfully. The admin will review your request.",
      request
    });
  } catch (error) {
    console.error("Request Password Reset Error:", error);
    res.status(500).json({ message: "Failed to submit password reset request" });
  }
};
