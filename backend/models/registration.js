const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    registrationType: {
      type: String,
      enum: ["NORMAL", "MERCHANDISE"],
      required: true
    },

    formResponses: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },

    merchandiseSelection: {
      itemId: String,
      itemName: String,
      size: String,
      color: String,
      unitPrice: Number,
      quantity: {
        type: Number,
        default: 1,
        min: 1
      }
    },

    ticketId: {
      type: String,
      unique: true,
      sparse: true
    },
    qrCodeUrl: {
      type: String
    },

    // Status: REGISTERED, PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED
    status: {
      type: String,
      enum: [
        "REGISTERED",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "COMPLETED"
      ],
      default: function () {
        return this.registrationType === "NORMAL" ? "REGISTERED" : "PENDING";
      }
    },


    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentProofUrl: {
      type: String
    },
    paymentProofSubmittedAt: {
      type: Date
    },


    attendanceMarked: {
      type: Boolean,
      default: false
    },
    attendedAt: {
      type: Date
    },


    attendanceAuditLog: [
      {
        action: { type: String, enum: ["MARKED", "UNMARKED", "MANUAL_OVERRIDE"] },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String
      }
    ],


    adminNotes: String
  },
  { timestamps: true }
);

registrationSchema.index({ event: 1, participant: 1 });
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ participant: 1, createdAt: -1 });
registrationSchema.index({ status: 1, registrationType: 1 });

module.exports = mongoose.model("Registration", registrationSchema);