const User = require("../models/user");
const OrganizerProfile = require("../models/organizer");
const Event = require("../models/event");
const Registration = require("../models/registration");
const PasswordResetRequest = require("../models/passwordResetRequest");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendEmail = async (email, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Email credentials not configured in .env");
      return false;
    }
    const info = await transporter.sendMail({
      from: `"FELICITY" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html
    });

    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};


// Create organizer
exports.createOrganizer = async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const {
      organizerName,
      description,
      category,
      contactEmail
    } = req.body;

    const normalizedCategory = (() => {
      if (!category) return category;
      const value = String(category).trim().toUpperCase();
      if (value === "COUNCIL" || value === "COUNCILS") return "COUNCIL";
      if (value === "CLUB" || value === "CLUBS") return "CLUB";
      if (value === "FEST_TEAM" || value === "FEST TEAM" || value === "EXTERNAL_ORGANIZATION") return "FEST_TEAM";
      return value;
    })();

    if (!organizerName || !description || !normalizedCategory || !contactEmail) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "All organizer fields required" });
    }

    const generateOrganizerEmail = (name, category) => {
      const namePart = name.trim().toLowerCase().replace(/\s+/g, '');
      const categoryMap = {
        'CLUB': 'club',
        'COUNCIL': 'council',
        'FEST_TEAM': 'fest'
      };
      const categoryPart = categoryMap[category] || category.toLowerCase();
      return `${namePart}@${categoryPart}.iiith.ac.in`;
    };

    const generatedEmail = generateOrganizerEmail(organizerName, normalizedCategory);


    const existingUser = await User.findOne({ email: generatedEmail }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Organizer with this name already exists" });
    }

    const rawPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await User.create([{
      email: generatedEmail,
      password: hashedPassword,
      role: "organizer"
    }], { session });

    const organizerProfile = await OrganizerProfile.create([{
      user: user[0]._id,
      organizerName,
      description,
      category: normalizedCategory,
      contactEmail,
      isActive: true
    }], { session });

    await session.commitTransaction();
    session.endSession();


    sendEmail(contactEmail, "Organizer Credentials - Felicity",
      `<h2>Welcome to Felicity!</h2>
         <p>Your organizer account has been created successfully.</p>
         <p><strong>Email:</strong> ${generatedEmail}</p>
         <p><strong>Password:</strong> ${rawPassword}</p>
         <p>Please use these credentials to login to your organizer account.</p>`
    ).catch(err => console.warn("Email failed but organizer created:", err.message));

    res.status(201).json({
      message: "Organizer created successfully",
      organizer: organizerProfile[0],
      generatedEmail,
      generatedPassword: rawPassword
    });

  } catch (error) {

    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Create Organizer Error:", error);
    res.status(500).json({ message: "Failed to create organizer", error: error.message });
  }
};


// Remove or disable organizer
exports.removeOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const { action } = req.body;

    const organizer = await OrganizerProfile.findById(organizerId);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    if (action === "disable") {
      organizer.isActive = false;
      await organizer.save();
      await User.findByIdAndUpdate(organizer.user, { isActive: false });

      return res.json({ message: "Organizer disabled successfully" });
    }

    if (action === "enable") {
      organizer.isActive = true;
      await organizer.save();
      await User.findByIdAndUpdate(organizer.user, { isActive: true });

      return res.json({ message: "Organizer enabled successfully" });
    }

    if (action === "archive") {
      organizer.isActive = false;
      organizer.archived = true;
      await organizer.save();

      return res.json({ message: "Organizer archived successfully" });
    }

    if (action === "delete") {

      const events = await Event.find({ organizer: organizerId });
      const eventIds = events.map(e => e._id);

      if (eventIds.length > 0) {
        await Registration.deleteMany({ event: { $in: eventIds } });

        const ForumMessage = require("../models/forumMessage");
        const Notification = require("../models/notification");
        await ForumMessage.deleteMany({ event: { $in: eventIds } });
        await Notification.deleteMany({ event: { $in: eventIds } });
      }

      await Event.deleteMany({ organizer: organizerId });

      const PasswordResetRequest = require("../models/passwordResetRequest");
      await PasswordResetRequest.deleteMany({ organizer: organizerId });

      await OrganizerProfile.findByIdAndDelete(organizerId);
      await User.findByIdAndDelete(organizer.user);

      return res.json({ message: "Organizer and all associated data permanently deleted" });
    }

    return res.status(400).json({
      message: "Invalid action. Use 'disable', 'enable', 'archive', or 'delete'"
    });

  } catch (error) {
    console.error("Remove Organizer Error:", error);
    res.status(500).json({ message: "Failed to process request" });
  }
};


// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalParticipants = await User.countDocuments({ role: "participant" });
    const totalOrganizers = await OrganizerProfile.countDocuments();
    const activeOrganizers = await OrganizerProfile.countDocuments({ isActive: true });

    res.json({
      totalParticipants,
      totalOrganizers,
      activeOrganizers,
      inactiveOrganizers: totalOrganizers - activeOrganizers
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};


// Get all organizers
exports.getAllOrganizers = async (req, res) => {
  try {
    const organizers = await OrganizerProfile.find()
      .populate("user", "email createdAt")
      .sort({ createdAt: -1 });

    res.json({ organizers });

  } catch (error) {
    console.error("Get Organizers Error:", error);
    res.status(500).json({ message: "Failed to fetch organizers" });
  }
};


// Get password reset requests
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate({
        path: "organizer",
        select: "organizerName category contactEmail"
      })
      .populate({
        path: "user",
        select: "email"
      })
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error("Get Reset Requests Error:", error);
    res.status(500).json({ message: "Failed to fetch password reset requests" });
  }
};


// Approve password reset
exports.approvePasswordReset = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;

    const resetRequest = await PasswordResetRequest.findById(requestId)
      .populate("organizer")
      .populate("user");

    if (!resetRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (resetRequest.status !== "PENDING") {
      return res.status(400).json({ message: "Request has already been processed" });
    }


    const newPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(newPassword, 10);


    await User.findByIdAndUpdate(resetRequest.user._id, { password: hashedPassword });


    resetRequest.status = "APPROVED";
    resetRequest.adminComment = comment || "Approved";
    resetRequest.generatedPassword = newPassword;
    await resetRequest.save();


    const contactEmail = resetRequest.organizer.contactEmail;
    if (contactEmail) {
      sendEmail(contactEmail, "Password Reset Approved - Felicity",
        `<h2>Password Reset Approved</h2>
         <p>Your password reset request has been approved.</p>
         <p><strong>Login Email:</strong> ${resetRequest.user.email}</p>
         <p><strong>New Password:</strong> ${newPassword}</p>
         <p>Please login and change your password immediately.</p>
         ${comment ? `<p><strong>Admin Note:</strong> ${comment}</p>` : ''}`
      ).catch(err => console.warn("Email failed:", err.message));
    }

    res.json({
      message: "Password reset approved",
      newPassword,
      organizerEmail: resetRequest.user.email
    });

  } catch (error) {
    console.error("Approve Reset Error:", error);
    res.status(500).json({ message: "Failed to approve password reset" });
  }
};


// Reject password reset
exports.rejectPasswordReset = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;

    const resetRequest = await PasswordResetRequest.findById(requestId)
      .populate("organizer")
      .populate("user");

    if (!resetRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (resetRequest.status !== "PENDING") {
      return res.status(400).json({ message: "Request has already been processed" });
    }

    resetRequest.status = "REJECTED";
    resetRequest.adminComment = comment || "Rejected";
    await resetRequest.save();


    const contactEmail = resetRequest.organizer.contactEmail;
    if (contactEmail) {
      sendEmail(contactEmail, "Password Reset Request Rejected - Felicity",
        `<h2>Password Reset Rejected</h2>
         <p>Your password reset request has been rejected.</p>
         ${comment ? `<p><strong>Reason:</strong> ${comment}</p>` : ''}
         <p>Please contact the admin for more information.</p>`
      ).catch(err => console.warn("Email failed:", err.message));
    }

    res.json({ message: "Password reset request rejected" });

  } catch (error) {
    console.error("Reject Reset Error:", error);
    res.status(500).json({ message: "Failed to reject password reset" });
  }
};