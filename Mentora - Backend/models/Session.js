import mongoose from "mongoose";

const asString = (v) => String(v ?? "").trim();

const countWords = (text) =>
  asString(text)
    .split(/\s+/)
    .filter(Boolean).length;

const timeRangeRegex =
  /^\d{1,2}([:.]\d{2})\s?(am|pm)\s?-\s?\d{1,2}([:.]\d{2})\s?(am|pm)$/i;

const STATUS = ["pending", "confirmed", "cancelled", "completed", "declined"];
const CANCELLED_BY = ["tutor", "tutee", null];

const SessionSchema = new mongoose.Schema(
  {
    tutorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Users", 
      required: true, 
      index: true 
    },

    tuteeId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Users", 
      required: true, 
      index: true 
    },

    slotId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "AvailabilitySlot", 
      default: null, 
      index: true 
    },

    sessionDate: { 
      type: Date, 
      required: true, 
      index: true 
    },

    sessionTimeRange: {
      type: String,
      required: true,
      trim: true,
      maxlength: [40, "sessionTimeRange must be 40 characters or fewer."],
      validate: {
        validator: (v) => timeRangeRegex.test(asString(v)),
        message: 'sessionTimeRange must look like "4:00 pm - 5:00 pm".',
      },
    },

    status: {
      type: String,
      required: true,
      lowercase: true,
      enum: { values: STATUS, message: "Invalid status." },
      default: "pending",
      index: true,
    },

    cancelledBy: {
      type: String,
      default: null,
      lowercase: true,
      enum: { values: CANCELLED_BY, message: "Invalid cancelledBy." },
    },

    preSessionObjectives: {
      type: String,
      required: [true, "preSessionObjectives is required."],
      trim: true,
      maxlength: [250, "preSessionObjectives is too long."],
      validate: {
        validator: (v) => countWords(v) <= 30,
        message: "preSessionObjectives must be 30 words or fewer.",
      },
    },

    preSessionQuestions: {
      type: [String],
      required: [true, "preSessionQuestions is required."],
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length > 0,
          message: "Please provide at least 1 question.",
        },
        {
          validator: (arr) => {
            const joined = (arr || []).map(asString).filter(Boolean).join(" ");
            return countWords(joined) <= 40;
          },
          message: "preSessionQuestions must be 40 words or fewer in total.",
        },
      ],
      set: (arr) => (Array.isArray(arr) ? arr.map(asString).filter(Boolean) : []),
    },

    preSessionDifficulties: {
      type: String,
      required: [true, "preSessionDifficulties is required."],
      trim: true,
      maxlength: [250, "preSessionDifficulties is too long."],
      validate: {
        validator: (v) => countWords(v) <= 30,
        message: "preSessionDifficulties must be 30 words or fewer.",
      },
    },

    areasCovered: {
      type: String,
      default: "",
      trim: true,
      maxlength: [600, "areasCovered is too long."],
      validate: {
        validator: (v) => !asString(v) || countWords(v) <= 60,
        message: "areasCovered must be 60 words or fewer.",
      },
    },

    nextLessonGoals: {
      type: String,
      default: "",
      trim: true,
      maxlength: [400, "nextLessonGoals is too long."],
      validate: {
        validator: (v) => !asString(v) || countWords(v) <= 40,
        message: "nextLessonGoals must be 40 words or fewer.",
      },
    },

    postSessionFeedback: {
      type: String,
      default: "",
      trim: true,
      maxlength: [600, "postSessionFeedback is too long."],
      validate: {
        validator: (v) => !asString(v) || countWords(v) <= 60,
        message: "postSessionFeedback must be 60 words or fewer.",
      },
    },

    tutorConfirmedAttendance: { type: Boolean, default: false },
    tuteeConfirmedAttendance: { type: Boolean, default: false },

    // Tracks if points and badges were already awarded for this session
    rewardsAwarded: { type: Boolean, default: false },

    // Stores when rewards were awarded, so i can audit and prevent duplicates
    rewardsAwardedAt: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// cancelledBy only if session was cancelled
SessionSchema.pre("validate", function (next) {
  const st = String(this.status || "").toLowerCase();
  const by = this.cancelledBy ?? null;

  if (st !== "cancelled" && by !== null) {
    this.cancelledBy = null;
  }
  if (st === "cancelled" && (by !== "tutor" && by !== "tutee")) {
  }
    // Validation for rewards tracking
  // If rewards were awarded, rewardsAwardedAt should be set
  if (this.rewardsAwarded === true && !this.rewardsAwardedAt) {
    this.invalidate("rewardsAwardedAt", "rewardsAwardedAt is required when rewardsAwarded is true.");
  }

  // If rewardsAwardedAt exists, rewardsAwarded should be true
  if (this.rewardsAwardedAt && this.rewardsAwarded !== true) {
    this.invalidate("rewardsAwarded", "rewardsAwarded must be true when rewardsAwardedAt is set.");
  }

  next();
});

export default mongoose.model("Session", SessionSchema);