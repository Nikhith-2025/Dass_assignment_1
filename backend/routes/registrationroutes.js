const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");
const registrationController = require("../controllers/registrationcontroller");

// Participant - register for event
router.post("/event/register", authMiddleware, authorizeRoles("participant"), registrationController.registerForEvent);

// Participant - purchase merchandise
router.post("/merchandise/purchase", authMiddleware, authorizeRoles("participant"), registrationController.purchaseMerchandise);

// Participant - upload payment proof
router.post("/upload-proof/:registrationId", authMiddleware, authorizeRoles("participant"), registrationController.uploadPaymentProof);

// Participant - get own registrations
router.get("/me", authMiddleware, authorizeRoles("participant"), registrationController.getParticipantRegistrations);

// Organizer - get event registrations
router.get("/event/:eventId", authMiddleware, authorizeRoles("organizer"), registrationController.getEventRegistrations);

// Organizer - export registrations as CSV
router.get("/event/:eventId/export", authMiddleware, authorizeRoles("organizer"), registrationController.exportRegistrationsCSV);

// Organizer - mark attendance
router.post("/:registrationId/attendance", authMiddleware, authorizeRoles("organizer"), registrationController.markAttendance);

// Organizer - QR scan attendance
router.post("/scan-qr", authMiddleware, authorizeRoles("organizer"), registrationController.scanQRAttendance);

// Organizer - live attendance stats
router.get("/event/:eventId/attendance", authMiddleware, authorizeRoles("organizer"), registrationController.getAttendanceStats);

// Organizer - export attendance CSV
router.get("/event/:eventId/attendance/export", authMiddleware, authorizeRoles("organizer"), registrationController.exportAttendanceCSV);

// Organizer - approve payment
router.post("/:registrationId/approve", authMiddleware, authorizeRoles("organizer"), registrationController.approvePayment);

// Organizer - reject payment
router.post("/:registrationId/reject", authMiddleware, authorizeRoles("organizer"), registrationController.rejectPayment);

// Participant - cancel registration
router.post("/:registrationId/cancel", authMiddleware, authorizeRoles("participant"), registrationController.cancelRegistration);

module.exports = router;
