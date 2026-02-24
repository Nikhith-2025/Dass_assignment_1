const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const nodemailer = require("nodemailer");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

// Socket.io events
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Join an event's forum room
  socket.on("join-event", (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`Socket ${socket.id} joined event-${eventId}`);
  });

  // Leave an event's forum room
  socket.on("leave-event", (eventId) => {
    socket.leave(`event-${eventId}`);
    console.log(`Socket ${socket.id} left event-${eventId}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Test route
app.get("/", (req, res) => {
  res.send("API Running...");
});


const authRoutes = require("./routes/authroutes");
const eventRoutes = require("./routes/eventroutes");
const organizerRoutes = require("./routes/organizerroutes");
const participantRoutes = require("./routes/participantroutes");
const registrationRoutes = require("./routes/registrationroutes");
const adminRoutes = require("./routes/adminroutes");
const forumRoutes = require("./routes/forumroutes");
const notificationRoutes = require("./routes/notificationroutes");


app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/notifications", notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  const Event = require("./models/event");
  const Registration = require("./models/registration");

  // One-time sync: fix stale registrations for already completed/cancelled events
  const syncStaleRegistrations = async () => {
    try {
      const completedEvents = await Event.find({ status: { $in: ["COMPLETED", "CLOSED"] } });
      if (completedEvents.length > 0) {
        await Registration.updateMany(
          { event: { $in: completedEvents.map(e => e._id) }, status: { $in: ["REGISTERED", "APPROVED"] } },
          { $set: { status: "COMPLETED" } }
        );
      }
      const cancelledEvents = await Event.find({ status: "CANCELLED" });
      if (cancelledEvents.length > 0) {
        await Registration.updateMany(
          { event: { $in: cancelledEvents.map(e => e._id) }, status: { $in: ["REGISTERED", "APPROVED", "PENDING"] } },
          { $set: { status: "CANCELLED" } }
        );
      }

      // Clean up orphaned registrations (event was deleted)
      const allEventIds = await Event.distinct("_id");
      await Registration.deleteMany({ event: { $nin: allEventIds } });
    } catch (err) {
      console.error("Stale registration sync error:", err.message);
    }
  };
  syncStaleRegistrations();

  // Auto-transition event statuses every 60 seconds
  const autoTransitionEvents = async () => {
    try {
      const now = new Date();

      await Event.updateMany(
        { status: "PUBLISHED", startDate: { $lte: now } },
        { $set: { status: "ONGOING" } }
      );

      const completedEvents = await Event.find(
        { status: "ONGOING", endDate: { $lte: now } }
      );
      if (completedEvents.length > 0) {
        const completedIds = completedEvents.map(e => e._id);
        await Event.updateMany(
          { _id: { $in: completedIds } },
          { $set: { status: "COMPLETED" } }
        );
        await Registration.updateMany(
          { event: { $in: completedIds }, status: { $in: ["REGISTERED", "APPROVED"] } },
          { $set: { status: "COMPLETED" } }
        );
      }
    } catch (err) {
      console.error("Auto-transition error:", err.message);
    }
  };
  autoTransitionEvents();
  setInterval(autoTransitionEvents, 60000);
});