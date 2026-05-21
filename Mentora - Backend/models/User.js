import mongoose from "mongoose";

const isInt = (v) => Number.isInteger(v);

const isEmail = (v) => {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim().toLowerCase());
};

const maxArrayLen = (max) => ({
  validator: (arr) => !arr || arr.length <= max,
  message: `Must have ${max} items or fewer.`,
});

const allNonEmptyStrings = {
  validator: (arr) =>
    !arr || arr.every((x) => typeof x === "string" && x.trim().length > 0),
  message: "Array items must be non-empty strings.",
};

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [2, "Username must be at least 2 characters."],
      maxlength: [40, "Username must be 40 characters or fewer."],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: isEmail,
        message: "Email format is invalid.",
      },
    },

    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters."],
      maxlength: [60, "Password must be 60 characters or fewer."],
    },

    // role is either tutor or tutee
    role: {
      type: String,
      enum: ["tutor", "tutee"],
      required: true,
    },

    schoolName: {
      type: String,
      default: "",
      trim: true,
      maxlength: [60, "School name must be 60 characters or fewer."],
    },

    // Tutor specific fields
    yearLevelsToTeach: {
      type: [String],
      default: [],
      validate: [allNonEmptyStrings, maxArrayLen(6)],
    },

    modulesAbleToTeach: {
      type: [String],
      default: [],
      validate: [allNonEmptyStrings, maxArrayLen(12)],
    },

    shortBio: {
      type: String,
      default: "",
      trim: true,
      maxlength: [30, "Short bio must be 30 characters or fewer."],
    },

    gpa: {
      type: Number,
      default: null,
      min: [0, "GPA must be at least 0."],
      max: [4, "GPA must be 4.0 or below."],
      validate: {
        validator: (v) => v === null || Number.isFinite(v),
        message: "GPA must be a valid number.",
      },
    },

    teachingStyle: {
      type: String,
      default: "",
      trim: true,
      enum: ["", "Visual", "Step-by-step", "Discussion-based"],
    },

    descriptionTeachApproach: {
      type: String,
      default: "",
      trim: true,
      maxlength: [80, "Teaching approach must be 80 characters or fewer."],
    },

    sessionDurationMinutes: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr) =>
          !arr ||
          arr.every((n) => Number.isFinite(n) && isInt(n) && n > 0 && n <= 240),
        message: "Session durations must be whole numbers between 1 and 240 minutes.",
      },
    },

    // Tutee specific fields
    yearOfStudy: {
      type: String,
      default: "",
      trim: true,
      enum: ["", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
    },

    modulesNeedHelpWith: {
      type: [String],
      default: [],
      validate: [allNonEmptyStrings, maxArrayLen(12)],
    },

    learningStyle: {
      type: String,
      default: "",
      trim: true,
      enum: ["", "Visual", "Step-by-step", "Discussion-based"],
    },

    // Shared fields, both tutor and tutee
    availableDays: {
      type: [String],
      default: [],
    },

    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Average rating cannot be below 0."],
      max: [5, "Average rating cannot be above 5."],
    },

    totalRatings: {
      type: Number,
      default: 0,
      min: [0, "Total ratings cannot be below 0."],
      validate: {
        validator: isInt,
        message: "Total ratings must be an integer.",
      },
    },

    completedSessionsCount: {
      type: Number,
      default: 0,
      min: [0, "Completed sessions cannot be below 0."],
      validate: {
        validator: isInt,
        message: "Completed sessions must be an integer.",
      },
    },

    attendanceRate: {
      type: Number,
      default: 100,
      min: [0, "Attendance rate cannot be below 0%."],
      max: [100, "Attendance rate cannot exceed 100%."],
    },

    badges: {
      type: [String],
      default: [],
      validate: [allNonEmptyStrings, maxArrayLen(30)],
    },

    points: {
      type: Number,
      default: 0,
      min: [0, "Points cannot be below 0."],
      validate: {
        validator: isInt,
        message: "Points must be an integer.",
      },
    },

    cancelledSessionsCount: {
      type: Number,
      default: 0,
      min: [0, "Cancelled sessions cannot be below 0."],
      validate: {
        validator: isInt,
        message: "Cancelled sessions must be an integer.",
      },
    },

    lastWarningAt: {
      type: Number,
      default: 0,
      min: [0, "lastWarningAt cannot be below 0."],
      validate: {
        validator: isInt,
        message: "lastWarningAt must be an integer.",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Users", userSchema);