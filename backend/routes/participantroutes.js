const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");
const participantController = require("../controllers/participantcontroller");

// Get own profile
router.get("/profile", authMiddleware, authorizeRoles("participant"), participantController.getProfile);

// Update profile
router.put("/profile", authMiddleware, authorizeRoles("participant"), participantController.updateProfile);

// Update preferences/interests
router.put("/preferences", authMiddleware, authorizeRoles("participant"), participantController.updatePreferences);

// Get all organizers/clubs
router.get("/organizers", authMiddleware, authorizeRoles("participant"), participantController.getOrganizers);

// Get followed clubs
router.get("/followed-clubs", authMiddleware, authorizeRoles("participant"), participantController.getFollowedClubs);

// Follow organizer
router.post("/follow", authMiddleware, authorizeRoles("participant"), participantController.followOrganizer);

// Unfollow organizer
router.post("/unfollow", authMiddleware, authorizeRoles("participant"), participantController.unfollowOrganizer);

// Change password
router.post("/change-password", authMiddleware, authorizeRoles("participant"), participantController.changePassword);

// Skip onboarding
router.post("/skip-onboarding", authMiddleware, authorizeRoles("participant"), participantController.skipOnboarding);

module.exports = router;
