const Registration = require("../models/registration");
const Event = require("../models/event");
const User = require("../models/user");
const OrganizerProfile = require("../models/organizer");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

const sendEmail = async (email, subject, html, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Felicity" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
      attachments
    });
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};

// Register for event
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId, formData } = req.body;
    const userId = req.user.id;


    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.status !== "PUBLISHED") {
      return res.status(400).json({ message: "Event is not open for registration" });
    }


    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: "Registration deadline has passed" });
    }


    const registrationCount = await Registration.countDocuments({
      event: eventId,
      status: { $in: ["REGISTERED", "COMPLETED"] }
    });

    if (registrationCount >= event.registrationLimit) {
      return res.status(400).json({ message: "Registration limit reached" });
    }


    const existing = await Registration.findOne({
      event: eventId,
      participant: userId
    });

    if (existing) {
      return res.status(400).json({ message: "Already registered for this event" });
    }


    const registration = await Registration.create({
      event: eventId,
      participant: userId,
      registrationType: "NORMAL",
      formResponses: formData || {},
      status: "REGISTERED",
      timestamps: { createdAt: new Date() }
    });


    const ticketId = registration._id.toString();
    const qrCode = await QRCode.toDataURL(ticketId);

    registration.ticketId = ticketId;
    registration.qrCodeUrl = qrCode;
    await registration.save();


    event.registrationCount = (event.registrationCount || 0) + 1;
    if (!event.isFormLocked) {
      event.isFormLocked = true;
    }
    await event.save();


    const user = await User.findById(userId);
    const eventDate = new Date(event.startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const eventTime = new Date(event.startDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #f8f8f8; padding: 24px;">
        <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #d9683a; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Felicity</h1>
            <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Registration Confirmed</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 20px; font-size: 15px; color: #333;">Hi <strong>${user.firstName}</strong>, you're all set for:</p>
            <h2 style="margin: 0 0 20px; font-size: 20px; color: #1a1a1a;">${event.name}</h2>
            <div style="background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 13px; width: 100px;">Date</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 500;">${eventDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #f0f0f0;">Time</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 500; border-top: 1px solid #f0f0f0;">${eventTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #f0f0f0;">Venue</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 500; border-top: 1px solid #f0f0f0;">${event.venue || 'Online'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #f0f0f0;">Ticket ID</td>
                  <td style="padding: 8px 0; color: #d9683a; font-size: 14px; font-weight: 600; border-top: 1px solid #f0f0f0; font-family: monospace;">${ticketId}</td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; padding: 20px 0; background: #fafafa; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #888;">Scan at the venue</p>
              <img src="cid:qrcode" alt="QR Code" style="width: 160px; height: 160px;" />
            </div>
            <p style="margin: 0; font-size: 13px; color: #999; text-align: center; line-height: 1.5;">Show this email or your ticket at the event entrance.</p>
          </div>
          <div style="padding: 16px 24px; background: #fafafa; border-top: 1px solid #eee; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #bbb;">Felicity Event Management • IIIT Hyderabad</p>
          </div>
        </div>
      </div>
    `;
    const qrBase64 = qrCode.replace(/^data:image\/png;base64,/, '');
    await sendEmail(user.email, `Registration Confirmed: ${event.name}`, emailHtml, [
      { filename: 'qrcode.png', content: Buffer.from(qrBase64, 'base64'), cid: 'qrcode' }
    ]);

    await registration.populate("event participant");

    res.status(201).json({
      message: "Registration successful",
      registration
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Purchase merchandise
exports.purchaseMerchandise = async (req, res) => {
  try {
    const { eventId, items } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items selected for purchase" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.type !== "MERCHANDISE") {
      return res.status(400).json({ message: "This is not a merchandise event" });
    }


    const registrations = [];
    let totalAmount = 0;

    for (const item of items) {
      const { itemId, quantity, size, color } = item;


      const merchItem = event.merchandiseItems?.find(i => i._id?.toString() === itemId);
      if (!merchItem) {
        return res.status(404).json({ message: `Item ${itemId} not found` });
      }

      const qty = parseInt(quantity) || 0;
      if (qty <= 0) continue;

      if (qty > merchItem.maxPerPerson) {
        return res.status(400).json({ message: `Maximum ${merchItem.maxPerPerson} items allowed per person for ${merchItem.name}` });
      }

      // Check stock availability
      if (merchItem.stock < qty) {
        return res.status(400).json({ message: `Insufficient stock for ${merchItem.name}. Available: ${merchItem.stock}` });
      }

      const unitPrice = merchItem.basePrice || 0;


      const registration = await Registration.create({
        event: eventId,
        participant: userId,
        registrationType: "MERCHANDISE",
        status: "PENDING",
        merchandiseSelection: {
          itemId,
          itemName: merchItem.name,
          size: size || null,
          color: color || null,
          unitPrice: unitPrice,
          quantity: qty
        },
        amountPaid: unitPrice * qty
      });

      registrations.push(registration);
      totalAmount += unitPrice * qty;
    }

    if (registrations.length === 0) {
      return res.status(400).json({ message: "No valid items to purchase" });
    }


    event.registrationCount = (event.registrationCount || 0) + registrations.length;
    await event.save();

    await Registration.populate(registrations, [
      { path: "event" },
      { path: "participant" }
    ]);

    res.status(201).json({
      message: "Order placed successfully. Please upload payment proof to complete your purchase.",
      registrations,
      totalAmount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload payment proof for a merchandise order
exports.uploadPaymentProof = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { paymentProof } = req.body; // base64 image string
    const userId = req.user.id;

    if (!paymentProof) {
      return res.status(400).json({ message: "Payment proof image is required" });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (registration.participant.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (registration.registrationType !== "MERCHANDISE") {
      return res.status(400).json({ message: "This is not a merchandise order" });
    }

    if (!["PENDING", "REJECTED"].includes(registration.status)) {
      return res.status(400).json({ message: "Payment proof can only be uploaded for pending or rejected orders" });
    }

    registration.paymentProofUrl = paymentProof;
    registration.paymentProofSubmittedAt = new Date();
    registration.status = "PENDING";
    await registration.save();

    res.json({ message: "Payment proof uploaded successfully", registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve payment
exports.approvePayment = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const registration = await Registration.findById(registrationId).populate("event participant");
    if (!registration) {
      return res.status(404).json({ message: "Order not found" });
    }


    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!registration.event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (registration.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending orders can be approved" });
    }


    const event = await Event.findById(registration.event._id);
    const merchItem = event.merchandiseItems?.find(
      i => i._id?.toString() === registration.merchandiseSelection?.itemId
    );

    if (merchItem) {
      const qty = registration.merchandiseSelection?.quantity || 1;
      if (merchItem.stock < qty) {
        return res.status(400).json({ message: `Insufficient stock for ${merchItem.name}. Available: ${merchItem.stock}` });
      }
      merchItem.stock -= qty;
      await event.save();
    }


    registration.status = "APPROVED";


    const ticketId = registration._id.toString();
    const qrCode = await QRCode.toDataURL(ticketId);
    registration.ticketId = ticketId;
    registration.qrCodeUrl = qrCode;
    await registration.save();


    const user = registration.participant;
    const sel = registration.merchandiseSelection;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #f8f8f8; padding: 24px;">
        <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #d9683a; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Felicity</h1>
            <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Payment Approved</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 20px; font-size: 15px; color: #333;">Hi <strong>${user.firstName}</strong>, your payment has been approved!</p>
            <h2 style="margin: 0 0 20px; font-size: 20px; color: #1a1a1a;">${event.name}</h2>
            <div style="background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #888; font-size: 13px;">Item</td><td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 500; text-align: right;">${sel?.itemName || 'Merchandise'}</td></tr>
                <tr><td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #f0f0f0;">Quantity</td><td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; border-top: 1px solid #f0f0f0;">×${sel?.quantity || 1}</td></tr>
                <tr><td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #f0f0f0;">Total</td><td style="padding: 8px 0; color: #d9683a; font-size: 16px; font-weight: 700; text-align: right; border-top: 1px solid #f0f0f0;">₹${registration.amountPaid}</td></tr>
                <tr><td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #f0f0f0;">Ticket ID</td><td style="padding: 8px 0; color: #d9683a; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace; border-top: 1px solid #f0f0f0;">${ticketId}</td></tr>
              </table>
            </div>
            <div style="text-align: center; padding: 20px 0; background: #fafafa; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #888;">Scan at the venue</p>
              <img src="cid:qrcode" alt="QR Code" style="width: 160px; height: 160px;" />
            </div>
            <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">Show this email when collecting your items.</p>
          </div>
          <div style="padding: 16px 24px; background: #fafafa; border-top: 1px solid #eee; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #bbb;">Felicity Event Management • IIIT Hyderabad</p>
          </div>
        </div>
      </div>
    `;

    const qrBase64 = qrCode.replace(/^data:image\/png;base64,/, '');
    await sendEmail(user.email, `Payment Approved: ${event.name}`, emailHtml, [
      { filename: 'qrcode.png', content: Buffer.from(qrBase64, 'base64'), cid: 'qrcode' }
    ]);

    res.json({ message: "Payment approved successfully", registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject payment
exports.rejectPayment = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { notes } = req.body;

    const registration = await Registration.findById(registrationId).populate("event participant");
    if (!registration) {
      return res.status(404).json({ message: "Order not found" });
    }


    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!registration.event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (registration.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending orders can be rejected" });
    }

    registration.status = "REJECTED";
    registration.adminNotes = notes || "Payment rejected by organizer";
    await registration.save();


    const user = registration.participant;
    const event = registration.event;
    await sendEmail(user.email, `Payment Rejected: ${event.name}`,
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #f8f8f8; padding: 24px;">
        <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #d9683a; padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Felicity</h1>
            <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Payment Rejected</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 20px; font-size: 15px; color: #333;">Hi <strong>${user.firstName}</strong>, your payment for <strong>${event.name}</strong> was rejected.</p>
            ${notes ? `<p style="margin: 0 0 20px; font-size: 14px; color: #666;"><strong>Reason:</strong> ${notes}</p>` : ''}
            <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">You can upload a new payment proof from the event page.</p>
          </div>
        </div>
      </div>`
    );

    res.json({ message: "Payment rejected", registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get participant registrations
exports.getParticipantRegistrations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type } = req.query;

    let filter = { participant: userId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const registrations = await Registration.find(filter)
      .populate({
        path: "event",
        populate: { path: "organizer", select: "organizerName" }
      })
      .populate("participant")
      .sort({ registrationDate: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get event registrations
exports.getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;


    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const registrations = await Registration.find({ event: eventId })
      .populate("participant")
      .sort({ registrationDate: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export registrations as CSV
exports.exportRegistrationsCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const registrations = await Registration.find({ event: eventId })
      .populate("participant");


    const csv = "Name,Email,Registration Date,Status,Attendance\n" +
      registrations.map(reg => {
        const participant = reg.participant;
        return `${participant.firstName} ${participant.lastName},${participant.email},${reg.createdAt},${reg.status},${reg.attendanceMarked ? "Yes" : "No"}`;
      }).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=registrations.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Scan QR code for attendance
exports.scanQRAttendance = async (req, res) => {
  try {
    const { ticketId } = req.body;

    if (!ticketId || !ticketId.trim()) {
      return res.status(400).json({ message: "Ticket ID is required" });
    }


    const registration = await Registration.findOne({ ticketId: ticketId.trim() })
      .populate("event")
      .populate("participant", "firstName lastName email");

    if (!registration) {
      return res.status(404).json({ message: "Invalid ticket — no registration found for this QR code" });
    }


    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!organizer || !registration.event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized for this event" });
    }


    if (!["PUBLISHED", "ONGOING"].includes(registration.event.status)) {
      return res.status(400).json({ message: "Attendance can only be marked for published or ongoing events" });
    }


    if (!["REGISTERED", "APPROVED"].includes(registration.status)) {
      return res.status(400).json({
        message: `Cannot mark attendance — registration status is ${registration.status}`
      });
    }


    if (registration.attendanceMarked) {
      return res.status(409).json({
        message: "Duplicate scan — attendance already marked",
        attendedAt: registration.attendedAt,
        participant: {
          name: `${registration.participant.firstName} ${registration.participant.lastName}`,
          email: registration.participant.email
        }
      });
    }


    registration.attendanceMarked = true;
    registration.attendedAt = new Date();
    registration.attendanceAuditLog.push({
      action: "MARKED",
      timestamp: new Date(),
      performedBy: req.user.id
    });
    await registration.save();

    res.json({
      message: "Attendance marked successfully",
      participant: {
        name: `${registration.participant.firstName} ${registration.participant.lastName}`,
        email: registration.participant.email
      },
      ticketId: registration.ticketId,
      attendedAt: registration.attendedAt
    });
  } catch (error) {
    console.error("QR Scan Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Manual attendance override
exports.markAttendance = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { attended, reason } = req.body;

    const registration = await Registration.findById(registrationId)
      .populate("event")
      .populate("participant", "firstName lastName email");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }


    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    if (!organizer || !registration.event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const wasMarked = registration.attendanceMarked;
    registration.attendanceMarked = attended;
    registration.attendedAt = attended ? new Date() : null;


    registration.attendanceAuditLog.push({
      action: attended ? "MANUAL_OVERRIDE" : "UNMARKED",
      timestamp: new Date(),
      performedBy: req.user.id,
      reason: reason || (attended ? "Manually marked by organizer" : "Manually unmarked by organizer")
    });

    await registration.save();

    res.json({
      message: `Attendance ${attended ? "marked" : "unmarked"} successfully (manual override)`,
      registration
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance stats
exports.getAttendanceStats = async (req, res) => {
  try {
    const { eventId } = req.params;


    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    const event = await Event.findById(eventId);
    if (!event || !organizer || !event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }


    const registrations = await Registration.find({
      event: eventId,
      status: { $in: ["REGISTERED", "APPROVED", "COMPLETED"] }
    }).populate("participant", "firstName lastName email");

    const scanned = registrations.filter(r => r.attendanceMarked);
    const notScanned = registrations.filter(r => !r.attendanceMarked);

    res.json({
      total: registrations.length,
      scanned: scanned.length,
      notScanned: notScanned.length,
      scannedParticipants: scanned.map(r => ({
        registrationId: r._id,
        ticketId: r.ticketId,
        name: `${r.participant.firstName} ${r.participant.lastName}`,
        email: r.participant.email,
        attendedAt: r.attendedAt,
        attendanceMarked: true
      })),
      notScannedParticipants: notScanned.map(r => ({
        registrationId: r._id,
        ticketId: r.ticketId,
        name: `${r.participant.firstName} ${r.participant.lastName}`,
        email: r.participant.email,
        attendanceMarked: false
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export attendance CSV
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    const organizer = await OrganizerProfile.findOne({ user: req.user.id });
    const event = await Event.findById(eventId);
    if (!event || !organizer || !event.organizer.equals(organizer._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const registrations = await Registration.find({
      event: eventId,
      status: { $in: ["REGISTERED", "APPROVED", "COMPLETED"] }
    }).populate("participant", "firstName lastName email");

    let csv = "Name,Email,Ticket ID,Attendance,Attended At\n";
    registrations.forEach(r => {
      const name = `${r.participant.firstName} ${r.participant.lastName}`;
      const email = r.participant.email;
      const ticketId = r.ticketId || "N/A";
      const attendance = r.attendanceMarked ? "Present" : "Absent";
      const attendedAt = r.attendedAt ? new Date(r.attendedAt).toISOString() : "N/A";
      csv += `"${name}","${email}","${ticketId}","${attendance}","${attendedAt}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendance-${eventId}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel registration
exports.cancelRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const userId = req.user.id;

    const registration = await Registration.findById(registrationId).populate("event");
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }


    if (registration.participant.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to cancel this registration" });
    }


    if (!["REGISTERED", "APPROVED", "PENDING"].includes(registration.status)) {
      return res.status(400).json({ message: "Cannot cancel a registration with status: " + registration.status });
    }

    registration.status = "CANCELLED";
    await registration.save();


    if (registration.event) {
      const event = await Event.findById(registration.event._id);
      if (event && event.registrationCount > 0) {
        event.registrationCount -= 1;
        await event.save();
      }
    }


    const user = await User.findById(userId);
    if (user) {
      const eventName = registration.event?.name || 'Unknown Event';
      await sendEmail(user.email, `Registration Cancelled: ${eventName}`,
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #f8f8f8; padding: 24px;">
          <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="background: #d9683a; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Felicity</h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Registration Cancelled</p>
            </div>
            <div style="padding: 28px 24px;">
              <p style="margin: 0 0 20px; font-size: 15px; color: #333;">Hi <strong>${user.firstName}</strong>, your registration for <strong>${eventName}</strong> has been cancelled.</p>
              <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">If this was a mistake, you can re-register from the event page.</p>
            </div>
          </div>
        </div>`
      );
    }

    res.json({ message: "Registration cancelled successfully", registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
