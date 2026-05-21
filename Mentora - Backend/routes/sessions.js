import express from "express";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import Users from "../models/User.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import { sendError } from "../utils/httpError.js";
import { awardRewardsIfCompleted } from "../services/rewardsService.js";

const router = express.Router();

const asString = (v) => String(v ?? "").trim();
const isObjId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));
const norm = (v) => asString(v).toLowerCase();

const firstError = (obj) => {
  const k = Object.keys(obj || {})[0];
  return k ? obj[k] : "";
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

const canSeeSession = (caller, session) =>
  String(session.tutorId) === String(caller) || String(session.tuteeId) === String(caller);

const STATUS = ["pending", "confirmed", "cancelled", "completed", "declined"];
const CANCELLED_BY = ["tutor", "tutee", null];

const isCompletedSession = (s) => {
  const st = norm(s.status);
  if (st === "completed") return true;
  if (st === "confirmed" && s.tutorConfirmedAttendance === true && s.tuteeConfirmedAttendance === true)
    return true;
  return false;
};

const isValidTransition = (from, to) => {
  const f = norm(from);
  const t = norm(to);
  if (f === t) return true;

  if (["completed", "cancelled", "declined"].includes(f)) return false;

  if (f === "pending") return ["confirmed", "declined", "cancelled"].includes(t);
  if (f === "confirmed") return ["completed", "cancelled"].includes(t);

  return false;
};

/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: List sessions (optional filter by tutorId and/or tuteeId)
 */

router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.tutorId) {
      if (!isObjId(req.query.tutorId)) return res.status(400).json({ message: "Invalid tutorId." });
      filter.tutorId = new mongoose.Types.ObjectId(req.query.tutorId);
    }

    if (req.query.tuteeId) {
      if (!isObjId(req.query.tuteeId)) return res.status(400).json({ message: "Invalid tuteeId." });
      filter.tuteeId = new mongoose.Types.ObjectId(req.query.tuteeId);
    }

    const list = await Session.find(filter).sort({ sessionDate: 1 }).lean();

    const mapped = list.map((s) => ({
      ...s,
      id: String(s._id),
      _id: String(s._id),
      tutorId: String(s.tutorId),
      tuteeId: String(s.tuteeId),
      slotId: s.slotId ? String(s.slotId) : null,
    }));

    return res.json(mapped);
  } catch (err) {
    return sendError(res, err, "Failed to load sessions.");
  }
});

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     summary: Get a single session by id (only tutor/tutee in the session can view)
 */

router.get("/:id", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    const id = asString(req.params.id);
    if (!isObjId(id)) return res.status(400).json({ message: "Invalid session id." });

    const session = await Session.findById(id).lean();
    if (!session) return res.status(404).json({ message: "Session not found." });

    if (!canSeeSession(callerId, session)) {
      return res.status(403).json({ message: "You are not allowed to view this session." });
    }

    return res.json({
      ...session,
      id: String(session._id),
      _id: String(session._id),
      tutorId: String(session.tutorId),
      tuteeId: String(session.tuteeId),
      slotId: session.slotId ? String(session.slotId) : null,
    });
  } catch (err) {
    return sendError(res, err, "Failed to load session.");
  }
});

/**
 * @swagger
 * /sessions:
 *   post:
 *     summary: Create a new session booking request (tutee books tutor session)
 */

router.post("/", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    if (!req.body) return res.status(400).json({ message: "Missing request body." });

    const {
      tutorId,
      tuteeId,
      slotId,
      sessionDate,
      sessionTimeRange,
      preSessionObjectives,
      preSessionQuestions,
      preSessionDifficulties,
    } = req.body || {};

    const errors = {};

    if (!tutorId) errors.tutorId = "tutorId is required.";
    else if (!isObjId(tutorId)) errors.tutorId = "Invalid tutorId.";

    if (!tuteeId) errors.tuteeId = "tuteeId is required.";
    else if (!isObjId(tuteeId)) errors.tuteeId = "Invalid tuteeId.";

    if (isObjId(tuteeId) && String(tuteeId) !== String(callerId)) {
      return res.status(403).json({ message: "You can only book sessions for your own account." });
    }

    const d = sessionDate ? new Date(sessionDate) : null;
    if (!sessionDate) errors.sessionDate = "sessionDate is required.";
    else if (!d || Number.isNaN(d.getTime())) errors.sessionDate = "Invalid sessionDate.";

    const tr = asString(sessionTimeRange);
    if (!tr) errors.sessionTimeRange = "sessionTimeRange is required.";

    const obj = asString(preSessionObjectives);
    if (!obj) errors.preSessionObjectives = "Please fill in your lesson objectives.";

    const qs = Array.isArray(preSessionQuestions) ? preSessionQuestions : [];
    if (!qs.length) errors.preSessionQuestions = "Please fill in your burning questions.";

    const diff = asString(preSessionDifficulties);
    if (!diff) errors.preSessionDifficulties = "Please fill in your common difficulties.";

    if (slotId !== undefined && slotId !== null && slotId !== "") {
      if (!isObjId(slotId)) errors.slotId = "Invalid slotId.";
    }

    if (Object.keys(errors).length) {
      return res.status(422).json({ message: firstError(errors), errors });
    }

    const tutor = await Users.findById(tutorId).lean();
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });
    if (tutor.role !== "tutor") return res.status(409).json({ message: "Target user is not a tutor." });

    const tutee = await Users.findById(tuteeId).lean();
    if (!tutee) return res.status(404).json({ message: "Tutee not found." });
    if (tutee.role !== "tutee") return res.status(409).json({ message: "Target user is not a tutee." });

    let lockedSlot = null;

    if (slotId) {
      lockedSlot = await AvailabilitySlot.findById(slotId).lean();
      if (!lockedSlot) return res.status(404).json({ message: "Availability slot not found." });

      if (String(lockedSlot.tutorId) !== String(tutorId)) {
        return res.status(409).json({ message: "This slot does not belong to the selected tutor." });
      }

      if (lockedSlot.isBooked === true) {
        return res.status(409).json({ message: "This slot is already booked. Please pick another slot." });
      }
    }

    const now = new Date();

    const created = await Session.create({
      tutorId,
      tuteeId,
      slotId: slotId || null,
      sessionDate: d,
      sessionTimeRange: tr,

      status: "pending",
      cancelledBy: null,

      preSessionObjectives: obj,
      preSessionQuestions: qs,
      preSessionDifficulties: diff,

      areasCovered: "",
      nextLessonGoals: "",
      postSessionFeedback: "",

      tutorConfirmedAttendance: false,
      tuteeConfirmedAttendance: false,

      createdAt: now,
      updatedAt: now,
    });

    if (lockedSlot) {
      await AvailabilitySlot.findByIdAndUpdate(
        slotId,
        { isBooked: true, sessionId: created._id, updatedAt: now },
        { new: false }
      );
    }

    return res.status(201).json({
      id: String(created._id),
      _id: String(created._id),
      tutorId: String(created.tutorId),
      tuteeId: String(created.tuteeId),
      slotId: created.slotId ? String(created.slotId) : null,
      sessionDate: created.sessionDate,
      sessionTimeRange: created.sessionTimeRange,
      status: created.status,
      cancelledBy: created.cancelledBy,
      preSessionObjectives: created.preSessionObjectives,
      preSessionQuestions: created.preSessionQuestions,
      preSessionDifficulties: created.preSessionDifficulties,
      areasCovered: created.areasCovered,
      nextLessonGoals: created.nextLessonGoals,
      postSessionFeedback: created.postSessionFeedback,
      tutorConfirmedAttendance: created.tutorConfirmedAttendance,
      tuteeConfirmedAttendance: created.tuteeConfirmedAttendance,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (err) {
    return sendError(res, err, "Failed to create session.");
  }
});

/**
 * @swagger
 * /sessions/{id}:
 *   put:
 *     summary: Update a session (status changes, attendance confirmation, post-session summary)
 */

router.put("/:id", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    const id = asString(req.params.id);
    if (!isObjId(id)) return res.status(400).json({ message: "Invalid session id." });
    if (!req.body) return res.status(400).json({ message: "Missing request body." });

    const existing = await Session.findById(id).lean();
    if (!existing) return res.status(404).json({ message: "Session not found." });

    if (!canSeeSession(callerId, existing)) {
      return res.status(403).json({ message: "You are not allowed to update this session." });
    }

    const isTutor = String(existing.tutorId) === String(callerId);
    const isTutee = String(existing.tuteeId) === String(callerId);

    const patch = {};

    if (req.body.status !== undefined) {
      const nextStatus = norm(req.body.status);
      if (!STATUS.includes(nextStatus)) {
        return res.status(422).json({ message: "Invalid status." });
      }

      // only tutor can confirm/decline a pending request
      if (["confirmed", "declined"].includes(nextStatus) && !isTutor) {
        return res.status(403).json({ message: "Only the tutor can confirm or decline a request." });
      }

      // only tutor/tutee involved in that session can cancel
      if (nextStatus === "cancelled" && !(isTutor || isTutee)) {
        return res.status(403).json({ message: "Not allowed." });
      }

      if (!isValidTransition(existing.status, nextStatus)) {
        return res.status(409).json({ message: `Invalid status transition: ${existing.status} -> ${nextStatus}` });
      }

      patch.status = nextStatus;
    }

    if (req.body.cancelledBy !== undefined) {
      const by = req.body.cancelledBy === null ? null : norm(req.body.cancelledBy);
      if (!CANCELLED_BY.includes(by)) return res.status(422).json({ message: "Invalid cancelledBy." });

      // only allow cancelledBy when cancelling
      const effectiveStatus = patch.status || norm(existing.status);
      if (by !== null && effectiveStatus !== "cancelled") {
        return res.status(409).json({ message: "cancelledBy can only be set when status is cancelled." });
      }
      patch.cancelledBy = by;
    }

    // attendance  (only each side can mark their own attendance)
    if (req.body.tutorConfirmedAttendance !== undefined) {
      if (!isTutor) return res.status(403).json({ message: "Only the tutor can update tutor attendance." });
      patch.tutorConfirmedAttendance = Boolean(req.body.tutorConfirmedAttendance);
    }
    if (req.body.tuteeConfirmedAttendance !== undefined) {
      if (!isTutee) return res.status(403).json({ message: "Only the tutee can update tutee attendance." });
      patch.tuteeConfirmedAttendance = Boolean(req.body.tuteeConfirmedAttendance);
    }

    // session summary fields only allowed when session is completed
    const wantsSummary =
      req.body.areasCovered !== undefined ||
      req.body.nextLessonGoals !== undefined ||
      req.body.postSessionFeedback !== undefined;

    if (wantsSummary) {
      const effectiveStatus = patch.status || norm(existing.status);

      const wouldBeCompleted =
        effectiveStatus === "completed" ||
        (effectiveStatus === "confirmed" &&
          (patch.tutorConfirmedAttendance ?? existing.tutorConfirmedAttendance) === true &&
          (patch.tuteeConfirmedAttendance ?? existing.tuteeConfirmedAttendance) === true);

      if (!wouldBeCompleted) {
        return res.status(409).json({ message: "Session summary can only be submitted after the session is completed." });
      }

      // only tutee writes summary after session completed
      if (!isTutee) {
        return res.status(403).json({ message: "Only the tutee can submit the session summary." });
      }

      if (req.body.areasCovered !== undefined) patch.areasCovered = asString(req.body.areasCovered);
      if (req.body.nextLessonGoals !== undefined) patch.nextLessonGoals = asString(req.body.nextLessonGoals);
      if (req.body.postSessionFeedback !== undefined) patch.postSessionFeedback = asString(req.body.postSessionFeedback);
    }

    // auto complete when both confirmed
    const nextTutorConfirmed = patch.tutorConfirmedAttendance ?? existing.tutorConfirmedAttendance;
    const nextTuteeConfirmed = patch.tuteeConfirmedAttendance ?? existing.tuteeConfirmedAttendance;
    const nextStatusCandidate = patch.status ?? norm(existing.status);

    if (nextStatusCandidate === "confirmed" && nextTutorConfirmed && nextTuteeConfirmed) {
      patch.status = "completed";
      patch.cancelledBy = null;
    }

    // if cancelled, enforce cancelledBy must be tutor/tutee
    if ((patch.status ?? norm(existing.status)) === "cancelled") {
      const by = patch.cancelledBy ?? existing.cancelledBy;
      if (by !== "tutor" && by !== "tutee") {
        return res.status(422).json({ message: "cancelledBy must be 'tutor' or 'tutee' when status is cancelled." });
      }
    }

    patch.updatedAt = new Date();

    const updated = await Session.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean();

    // If session was declined or cancelled, release availability slot if linked
    const finalStatus = norm(updated.status);
    if (["declined", "cancelled"].includes(finalStatus) && updated.slotId) {
      await AvailabilitySlot.findByIdAndUpdate(
        updated.slotId,
        { isBooked: false, sessionId: null, updatedAt: new Date() },
        { new: false }
      );
    }
    // Only award when session just became completed
    const wasCompleted = norm(existing.status) === "completed";
    const isNowCompleted = norm(updated.status) === "completed";

    try {
      if (!wasCompleted && isNowCompleted) {
        //awards points and unlocks badges only when a session transitsions into completed
        //this prevents double awarding if the session is updated multiple times.
        await awardRewardsIfCompleted(updated._id);
      }
    } catch (e) {
      console.error("Rewards error:", e?.message || e);
    }

    return res.json({
      ...updated,
      id: String(updated._id),
      _id: String(updated._id),
      tutorId: String(updated.tutorId),
      tuteeId: String(updated.tuteeId),
      slotId: updated.slotId ? String(updated.slotId) : null,
    });
  } catch (err) {
    return sendError(res, err, "Failed to update session.");
  }
});

/**
 * @swagger
 * /sessions/{id}:
 *   delete:
 *     summary: Delete a session (not allowed if confirmed/completed)
 */

router.delete("/:id", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    const id = asString(req.params.id);
    if (!isObjId(id)) return res.status(400).json({ message: "Invalid session id." });

    const existing = await Session.findById(id).lean();
    if (!existing) return res.status(404).json({ message: "Session not found." });

    if (!canSeeSession(callerId, existing)) {
      return res.status(403).json({ message: "You are not allowed to delete this session." });
    }

    const st = norm(existing.status);
    if (["confirmed", "completed"].includes(st)) {
      return res.status(409).json({ message: "Cannot delete a confirmed/completed session." });
    }

    await Session.findByIdAndDelete(id);

    if (existing.slotId) {
      await AvailabilitySlot.findByIdAndUpdate(
        existing.slotId,
        { isBooked: false, sessionId: null, updatedAt: new Date() },
        { new: false }
      );
    }

    return res.status(204).send();
  } catch (err) {
    return sendError(res, err, "Failed to delete session.");
  }
});

export default router;