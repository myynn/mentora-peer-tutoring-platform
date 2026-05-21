import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Users from "../models/User.js";
import { sendError } from "../utils/httpError.js";

const router = express.Router();

const getCallerId = (req) => String(req.headers["x-user-id"] || "").trim();

const requireLoggedIn = (req, res) => {
  const callerId = getCallerId(req);
  if (!callerId) {
    res.status(401).json({ message: "Missing x-user-id header." });
    return null;
  }
  return callerId;
};

const recomputeTutorRatingAndSave = async (tutorId) => {
  const agg = await Review.aggregate([
    { $match: { tutorId: new mongoose.Types.ObjectId(tutorId) } },
    { $group: { _id: "$tutorId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const avg = agg[0]?.avg ?? 0;
  const count = agg[0]?.count ?? 0;

  await Users.findByIdAndUpdate(tutorId, {
    averageRating: Number(Number(avg).toFixed(2)),
    totalRatings: count,
    updatedAt: new Date(),
  });
};

const asString = (v) => String(v ?? "").trim();

const wordCount = (text) =>
  asString(text)
    .split(/\s+/)
    .filter(Boolean).length;

const firstError = (errorsObj) => {
  const key = Object.keys(errorsObj)[0];
  return key ? errorsObj[key] : "";
};

const isObjId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: List reviews (filter by tutorId / tuteeId)
 */

router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.tutorId) {
      if (!isObjId(req.query.tutorId)) {
        return res.status(400).json({ message: "Invalid tutorId." });
      }
      filter.tutorId = new mongoose.Types.ObjectId(req.query.tutorId);
    }

    if (req.query.tuteeId) {
      if (!isObjId(req.query.tuteeId)) {
        return res.status(400).json({ message: "Invalid tuteeId." });
      }
      filter.tuteeId = new mongoose.Types.ObjectId(req.query.tuteeId);
    }

    const list = await Review.find(filter).sort({ createdAt: -1 }).lean();

    const mapped = list.map((r) => ({
      ...r,
      id: String(r._id),
      _id: String(r._id),
      tutorId: String(r.tutorId),
      tuteeId: String(r.tuteeId),
    }));

    return res.json(mapped);
  } catch (err) {
    return sendError(res, err, "Failed to fetch reviews.");
  }
});


/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a review
 */

router.post("/", async (req, res) => {
  try {
    const { tutorId, tuteeId, rating, comment } = req.body || {};

    if (!req.body) {
      return res.status(400).json({ message: "Missing request body." });
    }

    const errors = {};

    if (!tutorId) errors.tutorId = "tutorId is required.";
    else if (!isObjId(tutorId)) errors.tutorId = "Invalid tutorId.";

    if (!tuteeId) errors.tuteeId = "tuteeId is required.";
    else if (!isObjId(tuteeId)) errors.tuteeId = "Invalid tuteeId.";

    if (rating === undefined || rating === null || rating === "") {
      errors.rating = "rating is required.";
    } else {
      const r = Number(rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) errors.rating = "Rating must be 1 to 5.";
    }

    const c = asString(comment);
    if (!c) errors.comment = "Please write a short review comment.";
    else if (c.length > 180) errors.comment = "Comment must be 180 characters or fewer.";
    else if (wordCount(c) > 30) errors.comment = "Comment must be 30 words or fewer.";

    if (Object.keys(errors).length) {
      return res.status(422).json({ message: firstError(errors), errors });
    }

    const tutor = await Users.findById(tutorId).lean();
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });
    if (tutor.role !== "tutor") return res.status(409).json({ message: "Target user is not a tutor." });

    const tutee = await Users.findById(tuteeId).lean();
    if (!tutee) return res.status(404).json({ message: "Tutee not found." });
    if (tutee.role !== "tutee") return res.status(409).json({ message: "Target user is not a tutee." });


    const created = await Review.create({
      tutorId,
      tuteeId,
      rating: Number(rating),
      comment: c,
      createdAt: new Date(),
    });

    return res.status(201).json({
      id: String(created._id),
      _id: String(created._id),
      tutorId: String(created.tutorId),
      tuteeId: String(created.tuteeId),
      rating: created.rating,
      comment: created.comment,
      createdAt: created.createdAt,
    });
  } catch (err) {
    return sendError(res, err, "Failed to create review.");
  }
});

/**
 * @swagger
 * /reviews/{id}:
 *   put:
 *     summary: Update a review (only the review owner can edit)
 */
router.put("/:id", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    const reviewId = String(req.params.id || "").trim();
    if (!isObjId(reviewId)) return res.status(400).json({ message: "Invalid review id." });

    const existing = await Review.findById(reviewId).lean();
    if (!existing) return res.status(404).json({ message: "Review not found." });

    if (String(existing.tuteeId) !== String(callerId)) {
      return res.status(403).json({ message: "You can only edit your own review." });
    }

    const { rating, comment } = req.body || {};
    if (!req.body) return res.status(400).json({ message: "Missing request body." });

    const errors = {};

    if (rating === undefined || rating === null || rating === "") {
      errors.rating = "rating is required.";
    } else {
      const r = Number(rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) errors.rating = "Rating must be 1 to 5.";
    }

    const c = asString(comment);
    if (!c) errors.comment = "Please write a short review comment.";
    else if (c.length > 180) errors.comment = "Comment must be 180 characters or fewer.";
    else if (wordCount(c) > 30) errors.comment = "Comment must be 30 words or fewer.";

    if (Object.keys(errors).length) {
      return res.status(422).json({ message: firstError(errors), errors });
    }

    const updated = await Review.findByIdAndUpdate(
      reviewId,
      {
        rating: Number(rating),
        comment: c,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).lean();

    await recomputeTutorRatingAndSave(String(existing.tutorId));

    return res.status(200).json({
      ...updated,
      id: String(updated._id),
      _id: String(updated._id),
      tutorId: String(updated.tutorId),
      tuteeId: String(updated.tuteeId),
    });
  } catch (err) {
    return sendError(res, err, "Failed to update review.");
  }
});

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review (only the review owner can delete)
 */
router.delete("/:id", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    const reviewId = String(req.params.id || "").trim();
    if (!isObjId(reviewId)) return res.status(400).json({ message: "Invalid review id." });

    const existing = await Review.findById(reviewId).lean();
    if (!existing) return res.status(404).json({ message: "Review not found." });

    if (String(existing.tuteeId) !== String(callerId)) {
      return res.status(403).json({ message: "You can only delete your own review." });
    }

    const deleted = await Review.findByIdAndDelete(reviewId).lean();
    if (!deleted) return res.status(404).json({ message: "Review not found." });

    await recomputeTutorRatingAndSave(String(existing.tutorId));

    return res.status(200).json({ message: "Review deleted successfully." });
  } catch (err) {
    return sendError(res, err, "Failed to delete review.");
  }
});

export default router;