const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");
const organizerController = require("../controllers/organizercontroller");

// Get all organizers (public)
router.get("/", organizerController.getAllOrganizers);

// Get single organizer (public)
router.get("/:id", organizerController.getOrganizerDetail);

// Organizer profile - get own profile
router.get("/profile/me", authMiddleware, authorizeRoles("organizer"), organizerController.getProfile);

// Update organizer profile
router.put("/profile/me", authMiddleware, authorizeRoles("organizer"), organizerController.updateProfile);

// Request password reset
router.post("/request-password-reset", authMiddleware, authorizeRoles("organizer"), organizerController.requestPasswordReset);

module.exports = router;
