const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");
const adminController = require("../controllers/admincontroller");

// Admin only routes

// Dashboard stats
router.get("/dashboard", authMiddleware, authorizeRoles("admin"), adminController.getDashboardStats);

// Organizer management
router.post("/organizers", authMiddleware, authorizeRoles("admin"), adminController.createOrganizer);
router.get("/organizers", authMiddleware, authorizeRoles("admin"), adminController.getAllOrganizers);
router.delete("/organizers/:organizerId", authMiddleware, authorizeRoles("admin"), adminController.removeOrganizer);

// Password reset management
router.get("/password-reset-requests", authMiddleware, authorizeRoles("admin"), adminController.getPasswordResetRequests);
router.post("/password-reset-requests/:requestId/approve", authMiddleware, authorizeRoles("admin"), adminController.approvePasswordReset);
router.post("/password-reset-requests/:requestId/reject", authMiddleware, authorizeRoles("admin"), adminController.rejectPasswordReset);

module.exports = router;
