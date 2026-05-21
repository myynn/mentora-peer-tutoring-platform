import express from "express";
import Users from "../models/User.js";
import { sendError } from "../utils/httpError.js";

const router = express.Router();

// only allow the logged-in user to update/delete their own account
const requireSameUser = (req, res, next) => {
  const callerId = String(req.headers["x-user-id"] || "").trim();
  const targetId = String(req.params.id || "").trim();

  if (!callerId) {
    return res.status(401).json({ message: "Missing x-user-id header." });
  }

  if (callerId !== targetId) {
    return res
      .status(403)
      .json({ message: "You can only update or delete your own account." });
  }

  next();
};

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 */
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.username) filter.username = String(req.query.username).trim();
    if (req.query.email) filter.email = String(req.query.email).trim();
    if (req.query.role) {
      const role = String(req.query.role).trim();
      if (!["tutor", "tutee"].includes(role)) {
        return res.status(400).json({ message: "role must be tutor or tutee." });
      }
      filter.role = role;
    }

    if (req.query.password) filter.password = String(req.query.password);

    const users = await Users.find(filter).lean();

    const mapped = users.map((u) => ({
      ...u,
      id: String(u._id),
      _id: String(u._id),
    }));

    return res.status(200).json(mapped);
  } catch (err) {
    return sendError(res, err, "Failed to fetch users.");
  }
});

/**
 * @swagger
 * /users/tutors:
 *   get:
 *     summary: List tutors with search and filters
 */
router.get("/tutors", async (req, res) => {
  try {
    const {
      q = "",
      module = "",
      minRating = "",
      style = "",
      day = "",
      duration = "",
      year = "",
      sort = "relevance",
      limit = "100",
    } = req.query;

    // validate limit
    const lim = Number(limit);
    if (!Number.isFinite(lim) || lim <= 0) {
      return res.status(400).json({ message: "limit must be a positive number." });
    }

    // validate sort
    if (!["relevance", "rating", "new"].includes(sort)) {
      return res.status(400).json({ message: "sort must be relevance, rating, or new." });
    }

    // validate minRating if provided
    if (String(minRating).trim() !== "") {
      const mr = Number(minRating);
      if (!Number.isFinite(mr) || mr < 0 || mr > 5) {
        return res.status(400).json({ message: "minRating must be a number between 0 and 5." });
      }
    }

    const filter = { role: "tutor" };

    if (style) filter.teachingStyle = String(style).trim();

    if (minRating) filter.averageRating = { $gte: Number(minRating) || 0 };

    if (day) filter.availableDays = { $in: [String(day).trim()] };

    if (duration) {
      const d = Number(duration);
      if (!Number.isFinite(d)) return res.status(400).json({ message: "duration must be a number." });
      filter.sessionDurationMinutes = { $in: [d] };
    }

    if (year) filter.yearLevelsToTeach = { $in: [`Year ${String(year).trim()}`] };

    if (module) filter.modulesAbleToTeach = { $in: [String(module).trim()] };

    const needle = String(q || "").trim();
    if (needle) {
      const rx = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ username: rx }, { modulesAbleToTeach: rx }, { availableDays: rx }];
    }

    const sortObj =
      sort === "rating"
        ? { averageRating: -1 }
        : sort === "new"
        ? { createdAt: -1 }
        : {};

    const docs = await Users.find(filter)
      .sort(sortObj)
      .limit(Math.min(lim || 100, 200))
      .lean();

    const mapped = docs.map((u) => ({
      ...u,
      id: String(u._id),
      _id: String(u._id),
    }));

    return res.status(200).json(mapped);
  } catch (err) {
    return sendError(res, err, "Failed to fetch tutors.");
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by id
 */
router.get("/:id", async (req, res) => {
  try {
    const user = await Users.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({
      ...user,
      id: String(user._id),
      _id: String(user._id),
    });
  } catch (err) {
    return sendError(res, err, "Failed to fetch user.");
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update own profile
 */

router.put("/:id", requireSameUser, async (req, res) => {
  try {
    const updated = await Users.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({
      ...updated,
      id: String(updated._id),
      _id: String(updated._id),
    });
  } catch (err) {
    return sendError(res, err, "Update failed.");
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete own account
 */

router.delete("/:id", requireSameUser, async (req, res) => {
  try {
    const deleted = await Users.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (err) {
    return sendError(res, err, "Failed to delete user.");
  }
});

export default router;