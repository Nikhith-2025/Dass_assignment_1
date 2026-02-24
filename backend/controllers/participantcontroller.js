const User = require("../models/user");
const bcrypt = require("bcrypt");

// Get participant profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("followedOrganizers");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update participant profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, collegeOrganizationName, interests } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (contactNumber) user.contactNumber = contactNumber;
    if (collegeOrganizationName) user.collegeOrganizationName = collegeOrganizationName;
    if (interests) user.interests = interests;

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: "Profile updated successfully",
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update interests/preferences
exports.updatePreferences = async (req, res) => {
  try {
    const { interests } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.interests = interests || [];
    user.onboardingCompleted = true;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: "Preferences updated successfully",
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Follow organizer
exports.followOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    if (user.followedOrganizers.includes(organizerId)) {
      return res.status(400).json({ message: "Already following this organizer" });
    }

    user.followedOrganizers.push(organizerId);
    await user.save();

    res.json({
      message: "Organizer followed successfully",
      followedOrganizers: user.followedOrganizers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Unfollow organizer
exports.unfollowOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.followedOrganizers = user.followedOrganizers.filter(
      org => org.toString() !== organizerId
    );
    await user.save();

    res.json({
      message: "Organizer unfollowed successfully",
      followedOrganizers: user.followedOrganizers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }


    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Skip onboarding
exports.skipOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.onboardingCompleted = true;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: "Onboarding skipped",
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get all organizers
exports.getOrganizers = async (req, res) => {
  try {
    const OrganizerProfile = require("../models/organizer");
    const organizers = await OrganizerProfile.find()
      .populate("user", "email organizerName")
      .select("-__v");

    res.json({
      organizers: organizers.map(org => ({
        _id: org._id,
        organizerName: org.organizerName || org.user?.organizerName || "N/A",
        category: org.category || "CLUB",
        description: org.description || "",
        contactEmail: org.contactEmail || org.user?.email || "",
        totalMembers: org.totalMembers || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get followed clubs/organizers
exports.getFollowedClubs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: "followedOrganizers",
        select: "organizerName category description contactEmail"
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      followedClubs: user.followedOrganizers || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};