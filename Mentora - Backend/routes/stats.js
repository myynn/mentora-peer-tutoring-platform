import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Users from "../models/User.js";
import { sendError } from "../utils/httpError.js";
import Session from "../models/Session.js";

const router = express.Router();

const norm = (v) => String(v || "").trim().toLowerCase();
const isObjId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

// a session is completed if status === completed, OR status === confirmed AND both tutorConfirmedAttendance and tuteeConfirmedAttendance are true
//ensures consistent calulcations for attednacne rate, completed sessions count, points/badge awarding in rewardsservice
const isCompletedSession = (s) => {
  const st = norm(s.status);
  if (st === "completed") return true;
  if (
    st === "confirmed" &&
    s.tutorConfirmedAttendance === true &&
    s.tuteeConfirmedAttendance === true
  )
    return true;
  return false;
};

//tutor attendance, completed sessions always count, tutor cancelled sessions count (because it reflects tutor reliability), tutee cancelled sessions do not count against tutor
//tutee attendance, completed session always count, tutee cancelled sessions count (because it reflects tutee reliability), tutor cancelled sessions do not count against tutee
const isCountedForTutorAttendance = (s) => {
  const st = norm(s.status);

  // completed sessions always count
  if (isCompletedSession(s)) return true;

  // only count cancellations if the tutor cancelled
  if (st === "cancelled" && norm(s.cancelledBy) === "tutor") return true;

  return false;
};

const isCountedForTuteeAttendance = (s) => {
  const st = norm(s.status);
  if (isCompletedSession(s)) return true;
  //only count cancellations if tutee cancelled 
  if (st === "cancelled" && norm(s.cancelledBy) === "tutee") return true;
  return false;
};

//round to 1 decimal place 
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * @swagger
 * /stats/recomputeTutorRating/{tutorId}:
 *   post:
 *     summary: Recompute tutor averageRating and totalRatings
 */

//recalculate and store tutor rating statistics inside users table, this ensures tutor profile loads fast without re aggregating reviews every time
//updates averageRating (average of all review.rating values for tutor), totalRatings (count of reviews)
//average rating is calculated, by matching tutorid, group by tutorid, avg = aerage rating, count = umber of reviews
router.post("/recomputeTutorRating/:tutorId", async (req, res) => {

  try {
    const tutorId = String(req.params.tutorId || "").trim();
    if (!isObjId(tutorId)) return res.status(400).json({ message: "Invalid tutorId." });

    //aggregate all reviews for this tutor
    const agg = await Review.aggregate([
      { $match: { tutorId: new mongoose.Types.ObjectId(tutorId) } },
      { $group: { _id: "$tutorId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    //if no reviews exist, default avg and count to 0
    const avg = agg[0]?.avg ?? 0;
    const count = agg[0]?.count ?? 0;

    //update tutor's record in users table
    //store averagrating and totalratings for reads in profile pages
    const updated = await Users.findByIdAndUpdate(
      tutorId,
      {
        averageRating: Number(avg.toFixed(2)),//2 decimal place for average rating
        totalRatings: count,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Tutor not found." });

    return res.json({
      tutorId,
      averageRating: updated.averageRating,
      totalRatings: updated.totalRatings,
    });
  } catch (err) {
    return sendError(res, err, "Failed to recompute tutor stats.");
  }
});

/**
 * @swagger
 * /stats/recomputeTutorStats/{tutorId}:
 *   post:
 *     summary: Recompute tutor attendanceRate + completedSessionsCount (from sessions)
 */

//recalculates tutor session performance stats
//updates attendanceRate percentage, and completedSessionsCount
//tutor attendance calculation, countedSessions = sessions that are either completed or cancelled by tutor, completedSessions = sesion inside countedSessions that satisfy isCompletedSession(), attendanceRate = (completedSessions / countedSessions) * 100
router.post("/recomputeTutorStats/:tutorId", async (req, res) => {
  try {
    const tutorId = String(req.params.tutorId || "").trim();
    if (!isObjId(tutorId)) return res.status(400).json({ message: "Invalid tutorId." });

    const sessions = await Session.find({ tutorId: new mongoose.Types.ObjectId(tutorId) }).lean();

    const counted = sessions.filter(isCountedForTutorAttendance);
    const completed = counted.filter(isCompletedSession);

    //avoid divide by zero, if no sessions counted, default 100%
    const attendanceRate = counted.length === 0 ? 100 : round1((completed.length / counted.length) * 100);
    const completedSessionsCount = completed.length;

    const updated = await Users.findByIdAndUpdate(
      tutorId,
      { attendanceRate, completedSessionsCount, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Tutor not found." });

    return res.json({ tutorId, attendanceRate: updated.attendanceRate, completedSessionsCount: updated.completedSessionsCount });
  } catch (err) {
    return sendError(res, err, "Failed to recompute tutor stats.");
  }
});

/**
 * @swagger
 * /stats/recomputeTuteeStats/{tuteeId}:
 *   post:
 *     summary: Recompute tutee attendanceRate + completedSessionsCount + cancelledSessionsCount
 */

//recalculate tutee session performance stats
//updates attendanceRate, completedSessionsCount, cancelledSessionsCount
//countedSessions = sessions that are either completed or cancelled by tutee, attended = countedSessions where tuteeConfirmedAttendance === true, attendanceRate = (attended / coutnedSessions) * 100
//completedSessionsCount = number of sessions that satisfy isCompletedSession(), cancelledSessionsCount = number of sessions where status is cancelled and cancelledBy is Tutee
router.post("/recomputeTuteeStats/:tuteeId", async (req, res) => {
  try {
    const tuteeId = String(req.params.tuteeId || "").trim();
    if (!isObjId(tuteeId)) return res.status(400).json({ message: "Invalid tuteeId." });

    const sessions = await Session.find({ tuteeId: new mongoose.Types.ObjectId(tuteeId) }).lean();

    const counted = sessions.filter(isCountedForTuteeAttendance);
    //attended means the tutee actually confirmed attendance
    const attended = counted.filter((s) => s.tuteeConfirmedAttendance === true).length;

    const attendanceRate = counted.length === 0 ? 100 : round1((attended / counted.length) * 100);

    const completedSessionsCount = sessions.filter(isCompletedSession).length;

    const cancelledSessionsCount = sessions.filter(
      (s) => norm(s.status) === "cancelled" && norm(s.cancelledBy) === "tutee"
    ).length;

    const updated = await Users.findByIdAndUpdate(
      tuteeId,
      { attendanceRate, completedSessionsCount, cancelledSessionsCount, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Tutee not found." });

    return res.json({
      tuteeId,
      attendanceRate: updated.attendanceRate,
      completedSessionsCount: updated.completedSessionsCount,
      cancelledSessionsCount: updated.cancelledSessionsCount,
    });
  } catch (err) {
    return sendError(res, err, "Failed to recompute tutor stats.");
  }
});

export default router;