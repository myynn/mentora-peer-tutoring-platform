import mongoose from "mongoose";


/**
 * UserAchievement Schema
 *
 * Stores which badges a user has unlocked
 *
 * Key design points:
 * - userId + badgeKey unique index prevents duplicates
 * - unlockedAt records when badge was earned
 * - meta stores extra context (category, tier, etc)
 *
 * This creates a historical record of user achievements
 */

const UserAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Users",
    },
    badgeKey: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
      match: [/^[a-z0-9_]+$/, "badgeKey must be lowercase and use letters, numbers, underscores only."],
    },
    badgeType: {
      type: String,
      enum: ["tutor", "tutee", "both"],
      required: true,
    },
    unlockedAt: {
      type: Date,
      required: true,
      default: Date.now,
      validate: {
        validator: (v) => v <= new Date(),
        message: "unlockedAt cannot be in the future.",
      },
    },
    source: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { collection: "userAchievements" }
);

// this prevents duplicates for the same user and same badgekey
UserAchievementSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });
UserAchievementSchema.index({ userId: 1, unlockedAt: -1 });

export default mongoose.model("UserAchievement", UserAchievementSchema);