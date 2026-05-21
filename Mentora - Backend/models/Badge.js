import mongoose from "mongoose";

/**
 * Badge Schema
 *
 * This collection stores all possible badges in the system
 *
 * It acts as a badge catalog, defining:
 * - What badges exist
 * - Who can earn them (tutor / tutee / both)
 * - What category they belong to
 * - What criteria (tier) is required
 *
 * Users collection doesnt store full badge details, they only store badgeKey references
 */

const BadgeSchema = new mongoose.Schema(
  {
    badgeKey: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
      match: [/^[a-z0-9_]+$/, "badgeKey must be lowercase and use letters, numbers, underscores only."],
      unique: true,
    },
    badgeName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 220,
    },
    badgeType: {
      type: String,
      required: true,
      enum: ["tutor", "tutee", "both"],
    },
    category: {
      type: String,
      required: true,
      enum: ["completion", "reliability", "monthly", "points"],
    },
    tier: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
      validate: {
        validator: function (v) {
          if (this.category === "points") return v <= 10000;
          return v <= 1000;
        },
        message: "tier is out of allowed range for this category.",
      },
    },
    badgeCriteria: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
  },
  { collection: "badges" }
);

BadgeSchema.index({ badgeType: 1, category: 1, tier: 1 });

export default mongoose.model("Badge", BadgeSchema);