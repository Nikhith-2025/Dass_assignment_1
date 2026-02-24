const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
    getNotifications,
    markAsRead,
    markAllRead
} = require("../controllers/notificationcontroller");

// All routes require authentication
router.get("/", authMiddleware, getNotifications);
router.post("/:id/read", authMiddleware, markAsRead);
router.post("/read-all", authMiddleware, markAllRead);

module.exports = router;
