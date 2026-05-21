import mongoose from "mongoose";

const isValidObjId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

const wordCount = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const ReviewSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "tutorId is required."],
      index: true,
      validate: {
        validator: (v) => isValidObjId(v),
        message: "Invalid tutorId.",
      },
    },

    tuteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "tuteeId is required."],
      index: true,
      validate: {
        validator: (v) => isValidObjId(v),
        message: "Invalid tuteeId.",
      },
    },

    rating: {
      type: Number,
      required: [true, "Rating is required."],
      min: [1, "Rating must be at least 1."],
      max: [5, "Rating cannot exceed 5."],
      validate: {
        validator: (v) => Number.isInteger(Number(v)),
        message: "Rating must be a whole number (1–5).",
      },
    },

    comment: {
      type: String,
      required: [true, "Comment is required."],
      trim: true,
      maxlength: [180, "Comment must be 180 characters or fewer."],
      validate: {
        validator: (v) => wordCount(v) <= 30,
        message: "Comment must be 30 words or fewer.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


export default mongoose.model("Review", ReviewSchema);
