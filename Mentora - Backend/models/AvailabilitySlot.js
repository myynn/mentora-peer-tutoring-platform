import mongoose from "mongoose";

const timeRangeRegex =
  /^\d{1,2}([:.]\d{2})\s?(am|pm)\s?-\s?\d{1,2}([:.]\d{2})\s?(am|pm)$/i;

const AvailabilitySlotSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "tutorId is required."],
      index: true,
    },

    slotDate: {
      type: Date,
      required: [true, "slotDate is required."],
      index: true,
      validate: {
        validator: (value) => {
          if (!value) return false;
          return value.getTime() >= Date.now() - 60 * 1000;
        },
        message: "slotDate must be in the present or future.",
      },
    },

    timeRange: {
      type: String,
      required: [true, "timeRange is required."],
      trim: true,
      maxlength: [40, "Time range must be 40 characters or fewer."],
      validate: {
        validator: (v) => timeRangeRegex.test(String(v || "").trim()),
        message: 'Time range must look like "4:00 pm - 5:00 pm".',
      },
    },

    isBooked: { 
      type: Boolean, 
      default: false 
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      validate: {
        validator: (v) => v === null || mongoose.Types.ObjectId.isValid(v),
        message: "sessionId must be a valid ObjectId or null.",
      },
    },

    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { versionKey: false }
);

// Prevent duplicate slot for the tutor, same date and time range
AvailabilitySlotSchema.index(
  { tutorId: 1, slotDate: 1, timeRange: 1 },
  { unique: true }
);

export default mongoose.model("AvailabilitySlot", AvailabilitySlotSchema);
