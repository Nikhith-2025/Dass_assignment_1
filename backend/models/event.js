const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["NORMAL", "MERCHANDISE"],
      required: true
    },


    eligibility: {
      type: String,
      required: true
    },


    registrationDeadline: {
      type: Date,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },


    registrationLimit: {
      type: Number,
      required: true,
      min: 0
    },


    registrationFee: {
      type: Number,
      default: 0,
      min: 0
    },


    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizerProfile",
      required: true
    },


    category: {
      type: String,
      default: ''
    },


    tags: [
      {
        type: String,
        trim: true
      }
    ],


    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CLOSED", "CANCELLED"],
      default: "DRAFT"
    },


    venue: {
      type: String,
      default: ''
    },
    isOnline: {
      type: Boolean,
      default: false
    },


    customFields: [
      {
        id: mongoose.Schema.Types.Mixed,
        name: String,
        type: {
          type: String,
          enum: ["text", "email", "phone", "number", "date", "textarea", "select", "checkbox", "file"],
        },
        required: Boolean,
        options: [String]
      }
    ],




    isFormLocked: {
      type: Boolean,
      default: false
    },


    merchandiseItems: [
      {
        name: String,
        description: String,
        basePrice: { type: Number, default: 0 },
        stock: { type: Number, default: 0 },
        maxPerPerson: { type: Number, default: 5 },
        sizes: [String],
        colors: [String]
      }
    ],




    registrationCount: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    approvedRegistrations: {
      type: Number,
      default: 0
    },
    attendanceCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

eventSchema.index({ organizer: 1, status: 1 });
eventSchema.index({ name: "text", description: "text", tags: "text" });
eventSchema.index({ startDate: 1, status: 1 });

module.exports = mongoose.model("Event", eventSchema);