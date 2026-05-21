import express from "express";
import mongoose from "mongoose";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Users from "../models/User.js";
import { sendError } from "../utils/httpError.js";

const router = express.Router();

const asString = (v) => String(v ?? "").trim();
const isObjId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

const firstError = (errorsObj) => {
  const key = Object.keys(errorsObj)[0];
  return key ? errorsObj[key] : "";
};

const getCallerId = (req) => asString(req.headers["x-user-id"]);

const requireLoggedIn = (req, res) => {
  const callerId = getCallerId(req);
  if (!callerId) {
    res.status(401).json({ message: "Missing x-user-id header." });
    return null;
  }
  if (!isObjId(callerId)) {
    res.status(400).json({ message: "Invalid x-user-id header." });
    return null;
  }
  return callerId;
};

const timeRangeRegex =
  /^\d{1,2}([:.]\d{2})\s?(am|pm)\s?-\s?\d{1,2}([:.]\d{2})\s?(am|pm)$/i;

const isValidTimeRange = (v) => timeRangeRegex.test(asString(v));

/**
 * @swagger
 * /availabilitySlots:
 *   get:
 *     summary: List availability slots (filter by tutorId/sessionId)
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

    if (req.query.sessionId) {
      if (!isObjId(req.query.sessionId)) {
        return res.status(400).json({ message: "Invalid sessionId." });
      }
      filter.sessionId = new mongoose.Types.ObjectId(req.query.sessionId);
    }

    const list = await AvailabilitySlot.find(filter).sort({ slotDate: 1 }).lean();

    const mapped = list.map((s) => ({
      ...s,
      id: String(s._id),
      _id: String(s._id),
      tutorId: String(s.tutorId),
      sessionId: s.sessionId ? String(s.sessionId) : null,
    }));

    return res.json(mapped);
  } catch (err) {
    return sendError(res, err, "Failed to load availability slots.");
  }
});


/**
 * @swagger
 * /availabilitySlots:
 *   post:
 *     summary: Create an availability slot
 */

router.post("/", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    if (!req.body) {
      return res.status(400).json({ message: "Missing request body." });
    }

    const { tutorId, slotDate, timeRange } = req.body || {};
    const errors = {};

    if (!tutorId) errors.tutorId = "tutorId is required.";
    else if (!isObjId(tutorId)) errors.tutorId = "Invalid tutorId.";

    const d = slotDate ? new Date(slotDate) : null;
    if (!slotDate) errors.slotDate = "slotDate is required.";
    else if (!d || Number.isNaN(d.getTime())) errors.slotDate = "Invalid slotDate.";

    const tr = asString(timeRange);
    if (!tr) errors.timeRange = "Please enter a time range.";
    else if (!isValidTimeRange(tr))
      errors.timeRange = 'Time range must look like "4:00 pm - 5:00 pm".';
    else if (tr.length > 40) errors.timeRange = "Time range must be 40 characters or fewer.";

    if (Object.keys(errors).length) {
      return res.status(422).json({ message: firstError(errors), errors });
    }

    if (String(tutorId) !== String(callerId)) {
      return res.status(403).json({ message: "You can only create slots for your own account." });
    }

    const tutor = await Users.findById(tutorId).lean();
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });
    if (tutor.role !== "tutor") {
      return res.status(409).json({ message: "Target user is not a tutor." });
    }

    const now = new Date();

    const created = await AvailabilitySlot.create({
      tutorId,
      slotDate: d,
      timeRange: tr,
      isBooked: false,
      sessionId: null,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      id: String(created._id),
      _id: String(created._id),
      tutorId: String(created.tutorId),
      slotDate: created.slotDate,
      timeRange: created.timeRange,
      isBooked: created.isBooked,
      sessionId: created.sessionId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "This time slot already exists for the selected date.",
      });
    }
    return sendError(res, err, "Failed to create availability slot.");
  }
});

/**
 * @swagger
 * /availabilitySlots/{id}:
 *   put:
 *     summary: Update an availability slot
 */

router.put("/:id", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    const slotId = asString(req.params.id);
    if (!isObjId(slotId)) {
      return res.status(400).json({ message: "Invalid slot id." });
    }

    const existing = await AvailabilitySlot.findById(slotId).lean();
    if (!existing) return res.status(404).json({ message: "Slot not found." });

    if (String(existing.tutorId) !== String(callerId)) {
      return res.status(403).json({ message: "You can only update your own slots." });
    }

    const patch = {};
    if (req.body?.slotDate !== undefined) patch.slotDate = req.body.slotDate;
    if (req.body?.timeRange !== undefined) patch.timeRange = req.body.timeRange;
    if (req.body?.isBooked !== undefined) patch.isBooked = req.body.isBooked;
    if (req.body?.sessionId !== undefined) patch.sessionId = req.body.sessionId;

    const updated = await AvailabilitySlot.findByIdAndUpdate(
      slotId,
      { ...patch, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    return res.json({
      ...updated,
      id: String(updated._id),
      _id: String(updated._id),
      tutorId: String(updated.tutorId),
      sessionId: updated.sessionId ? String(updated.sessionId) : null,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "This time slot already exists for the selected date.",
      });
    }
    return sendError(res, err, "Failed to update availability slot.");
  }
});

export default router;