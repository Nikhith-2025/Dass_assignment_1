const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const forumController = require("../controllers/forumcontroller");

// Get messages for an event (authenticated users)
router.get("/:eventId/messages", authMiddleware, forumController.getMessages);

// Post a message (authenticated users — controller checks registration/organizer)
router.post("/:eventId/messages", authMiddleware, forumController.postMessage);

// Delete a message (organizer or author)
router.delete("/:eventId/messages/:messageId", authMiddleware, forumController.deleteMessage);

// Pin/unpin a message (organizer only)
router.post("/:eventId/messages/:messageId/pin", authMiddleware, forumController.togglePin);

// React to a message (authenticated users)
router.post("/:eventId/messages/:messageId/react", authMiddleware, forumController.reactToMessage);

module.exports = router;
