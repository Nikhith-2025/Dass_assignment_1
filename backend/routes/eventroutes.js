const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");
const eventController = require("../controllers/eventcontroller");
const registrationController = require("../controllers/registrationcontroller");

// Public routes
router.get("/browse", eventController.browseEvents);
router.get("/", eventController.browseEvents); // Alias for /browse
router.get("/trending", eventController.getTrendingEvents);

// Organizer routes (must come before /:id routes)
router.post("/", authMiddleware, authorizeRoles("organizer"), eventController.createEvent);
router.get("/organizer/events", authMiddleware, authorizeRoles("organizer"), eventController.getOrganizerEvents);
router.put("/:id", authMiddleware, authorizeRoles("organizer"), eventController.updateEvent);
router.post("/:id/publish", authMiddleware, authorizeRoles("organizer"), eventController.publishEvent);
router.post("/:id/cancel", authMiddleware, authorizeRoles("organizer"), eventController.cancelEvent);

// Public organizer events route (must come after /organizer/events)
router.get("/organizer/:organizerId", eventController.getOrganizerPublicEvents);

// Registration route (must come after /organizer/events)
router.post("/:id/register", authMiddleware, authorizeRoles("participant"), async (req, res) => {
  try {
    // Convert URL param to body format expected by registerForEvent
    const modifiedReq = {
      ...req,
      body: {
        ...req.body,
        eventId: req.params.id
      }
    };
    await registrationController.registerForEvent(modifiedReq, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", eventController.getEventDetail);

module.exports = router;
