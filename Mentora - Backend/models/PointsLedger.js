import mongoose from "mongoose";

/**
 * PointsLedger Schema
 *
 * Stores a full transaction history of points
 *
 * - users can see why they earned points
 * - system can trace how points were awarded
 * - helps diagnose incorrect point balances
 *
 * This avoids relying only on Users.points from the users collectin, which is a derived total of points the user has earned
 */
const PointsLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Users",
    },
    role: {
      type: String,
      enum: ["tutor", "tutee"],
      required: true,
    },
    delta: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      enum: ["session_completed", "milestone_sessions"],
    },
    referenceType: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },
    referenceId: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
      validate: {
        validator: (v) => v === "" || mongoose.Types.ObjectId.isValid(v),
        message: "referenceId must be a valid ObjectId string.",
      },
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
      validate: {
        validator: (v) => v <= new Date(),
        message: "createdAt cannot be in the future.",
      },
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { collection: "pointsLedger" }
);

PointsLedgerSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("PointsLedger", PointsLedgerSchema);