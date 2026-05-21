import express from "express";
import Badge from "../models/Badge.js";
import { sendError } from "../utils/httpError.js";

const router = express.Router();

//this is used by the frontend to fetch badge details by badgekey
//for example first_step or points_30, and needs their badgename/description
const MAX_KEYS = 30;
//sam key format used in schema to prevent unexpected formats, only lowercase letters, digits, 2-60 chars
const KEY_RE = /^[a-z0-9_]{2,60}$/;

// GET /badges?keys=first_step,points_30
//validations include, keys query must exist and not be empty, limit number of keys to avoid hhuge DB query, validate each key format, dedupe keys for efficiency, return ordered results to match request order

/**
 * @swagger
 * /badges:
 *   get:
 *     summary: Get badge details by badge keys (e.g. keys=first_step,points_30)
 */

router.get("/", async (req, res) => {
  try {
    const raw = String(req.query.keys ?? "").trim();

    // 400 if query missing/empty
    if (!raw) {
      return res.status(400).json({ message: "Missing or empty 'keys' query parameter." });
    }

    //split "a,b,c" to make ["a", "b", "c"]
    const keys = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    // 400 if nothing after splitting
    if (!keys.length) {
      return res.status(400).json({ message: "No badge keys provided." });
    }

    // 413 if payload too large to avoid too many keys
    if (keys.length > MAX_KEYS) {
      return res.status(413).json({ message: `Too many badge keys. Max allowed is ${MAX_KEYS}.` });
    }

    // validate each key follows allowed format
    const invalid = keys.filter((k) => !KEY_RE.test(k));
    if (invalid.length) {
      return res.status(400).json({
        message: "One or more badge keys are invalid. Use lowercase letters, numbers, underscores (2-60 chars).",
        invalidKeys: invalid,
      });
    }

    // remove duplicates to improve performance
    const uniqueKeys = [...new Set(keys)];

    //query only the requestesd badges
    const badges = await Badge.find({ badgeKey: { $in: uniqueKeys } })
      .select("badgeKey badgeName description badgeType category tier badgeCriteria")
      .lean();

    // return 404 if none found
    if (!badges.length) {
      return res.status(404).json({ message: "No badges found for the provided keys." });
    }

    // Return badges in the same order the frontend requested them
    const map = new Map(badges.map((b) => [b.badgeKey, b]));
    const ordered = uniqueKeys.map((k) => map.get(k)).filter(Boolean);

    return res.status(200).json(ordered);
  } catch (err) {
    return sendError(res, err, "Failed to fetch badges.");
  }
});

export default router;