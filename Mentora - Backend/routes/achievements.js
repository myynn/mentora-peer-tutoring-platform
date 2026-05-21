import express from "express";
import mongoose from "mongoose";
import Users from "../models/User.js";
import Badge from "../models/Badge.js";
import UserAchievement from "../models/UserAchievement.js";
import PointsLedger from "../models/PointsLedger.js";
import Session from "../models/Session.js";
import { sendError } from "../utils/httpError.js";

const router = express.Router();

// Convert any value into a lowercase string for safe comparisons
// prevents issues like Tutor vs tutor
const norm = (v) => String(v || "").trim().toLowerCase();
// Convert any value into a trimmed string which keeps empty values as ""
const asString = (v) => String(v ?? "").trim();
// Validate MongoDB ObjectId format
const isObjId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

// Extract the logged-in user's ID from request headers
// my frontend httpClient automatically adds x-user-id for authenticated users
const getCallerId = (req) => asString(req.headers["x-user-id"]);

//Ensures this request is made by a logged-in user, backend uses x-user-id header as the identifier
//Returns callerId if valid, else returns null and sends an error response
const requireLoggedIn = (req, res) => {
  const callerId = getCallerId(req);
  // 401 not authenticated (missing header)
  if (!callerId) {
    res.status(401).json({ message: "Missing x-user-id header." });
    return null;
  }

  // 400 invalid request format (invalid ObjectId)
  if (!isObjId(callerId)) {
    res.status(400).json({ message: "Invalid x-user-id header." });
    return null;
  }
  return callerId;
};

//Achievements are separated by role tutor or tutee, this ensures the UI cannot request the wrong role data
const getRoleQuery = (req, res) => {
  const role = norm(req.query.role);
  if (!["tutor", "tutee"].includes(role)) {
    res.status(400).json({ message: "role query param must be tutor or tutee." });
    return null;
  }
  return role;
};

//A session is completed if, status is "completed", or, status is "confirmed" AND both tutor + tutee confirmed attendance
//completion badges depend on completed session count, points awarding happens only when a session becomes completed
const isCompletedSession = (s) => {
  const st = norm(s.status);
  if (st === "completed") return true;
  if (st === "confirmed" && s.tutorConfirmedAttendance === true && s.tuteeConfirmedAttendance === true) return true;
  return false;
};

//if user cancels, it will break their reliability streak badge
const isSelfCancelled = (s, role) =>
  norm(s.status) === "cancelled" && norm(s.cancelledBy) === role;

//if the other user cancels, the user's reilability streak badge wont break/we ignore the cancel of session made by other user
const isOtherCancelled = (s, role) =>
  norm(s.status) === "cancelled" && norm(s.cancelledBy) && norm(s.cancelledBy) !== role;

//used for reilability badges like completed 5 or 10 sessions in a row without cancelling
//this sorts sessions by latest activity updatedAt/createdAt, so we process the most recent first, this is to count consecutive completed sessions
//if the user cancels, the streak ends, but if the other user cancels their own streak wont end
const computeReliabilityStreak = (sessions, role, target) => {
  const sorted = sessions
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  let streak = 0;

  for (const s of sorted) {
    //completed sessions count toward streak
    if (isCompletedSession(s)) {
      streak += 1;
      if (streak >= target) return target; //stop once we meet the badge's goal
      continue;
    }
    //if the user cancels, streak breaks immediately
    if (isSelfCancelled(s, role)) {
      // we keep whatever streak we already counted from newer completed sessions, this avoids incorrectly resetting the streaks to 0
      return streak;
    }
    //if other user cancels, we ignore it and doesnt affect user's streak
    if (isOtherCancelled(s, role)) {
      continue;
    }

    // ignore pending/confirmed/declined as it is not counted towards the streak
  }

  return streak;
};

//calculates badge progress for locked/unlocked badges
//here are the badge categories available, completion is based on completed session count, points is based on current users points
//reliability is based on the reliability streak function above
//the output is always current, target, percent, so the UI can show the progress bar consistently
const computeBadgeProgress = (badge, ctx) => {
  //badge based on number of completed sessions
  if (badge.category === "completion") {
    const target = Number(badge.tier || 0);
    const current = Math.min(ctx.completedSessions, target);
    return { current, target, percent: target === 0 ? 0 : Math.round((current / target) * 100) };
  }

  //badge based on points earned
  if (badge.category === "points") {
    const target = Number(badge.tier || 0);
    const current = Math.min(ctx.points, target);
    return { current, target, percent: target === 0 ? 0 : Math.round((current / target) * 100) };
  }

  //badge based on reliability streak, consecutive completions without cancelling
  if (badge.category === "reliability") {
    const target = Number(badge.tier || 0);
    const current = Math.min(ctx.reliabilityStreakForBadge(badge), target);
    const percent = target === 0 ? 0 : Math.round((current / target) * 100);
    return { current, target, percent };
  }

  //fallback for unknown badge types
  return { current: 0, target: 0, percent: 0 };
};

//returns a full achievemnts dashboard summary, user info which is their points, leaderboard with top 30 for each tutor and tutee roles
//rank where the user stands on the leaderboard based on points, ledger preview which shows their latest points history, badges catalog and progress/unlocked status of the badge

/**
 * @swagger
 * /achievements/summary:
 *   get:
 *     summary: Get achievements dashboard summary (leaderboard, points, ledger preview, badges)
 */

router.get("/summary", async (req, res) => {
  try {
    //authentication
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    //validate role query param
    const role = getRoleQuery(req, res);
    if (!role) return;

    //load user from DB
    const user = await Users.findById(callerId).lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    //security check, prvents users from viewing achievemts fot opposite role
    if (norm(user.role) !== role) {
      return res.status(403).json({ message: "You are not allowed to access this achievements page." });
    }

    //ledger limit to avoid huge queries
    const ledgerLimit = Math.min(Math.max(parseInt(req.query.ledgerLimit || "3", 10), 1), 20);

    // Leaderboard sorts points desc so the highest points users are top, tie-breaks are determined by username
    const leaderboard = await Users.find({ role })
      .sort({ points: -1, username: 1 })
      .select("_id username points")
      .limit(30)
      .lean();

    const mappedLeaderboard = leaderboard.map((u, idx) => ({
      rank: idx + 1,
      id: String(u._id),
      username: u.username,
      points: Number(u.points || 0),
    }));

    // find caller rank within the leaderboard list
    const callerIndex = mappedLeaderboard.findIndex((x) => String(x.id) === String(callerId));
    const callerRank = callerIndex >= 0 ? callerIndex + 1 : null;

    // points history preview, which shows latest point transactions like +10 points
    const ledger = await PointsLedger.find({ userId: new mongoose.Types.ObjectId(callerId), role })
      .sort({ createdAt: -1 })
      .limit(ledgerLimit)
      .lean();

    const ledgerMapped = ledger.map((x) => ({
      id: String(x._id),
      delta: x.delta,
      reason: x.reason,
      referenceType: x.referenceType,
      referenceId: x.referenceId,
      createdAt: x.createdAt,
      meta: x.meta || {},
    }));

    // badges catalog , loads all badges relevant to this role, loads unlocked badges from the userachievement table, compute users progress for badges not earned yet
    const badges = await Badge.find({
      $or: [{ badgeType: "both" }, { badgeType: role }],
    })
      .sort({ category: 1, tier: 1 })
      .lean();

    const unlocked = await UserAchievement.find({ userId: new mongoose.Types.ObjectId(callerId) }).lean();
    //maps unlocked badges by badgekey so lookups are 0(1)
    const unlockedMap = new Map(unlocked.map((ua) => [ua.badgeKey, ua]));

    // compute progress context using completed sessions from sessions collection, points from users table, reliability streak using recent session history
    const sessions = await Session.find({ [role === "tutor" ? "tutorId" : "tuteeId"]: new mongoose.Types.ObjectId(callerId) }).lean();
    const completedSessions = sessions.filter(isCompletedSession).length;

    const points = Number(user.points || 0);

    // reliability counts
    const ctx = {
    completedSessions,
    points,
    reliabilityStreakForBadge: (badge) =>
        computeReliabilityStreak(sessions, role, Number(badge.tier || 0)),
    };

    //final badge mapping used by frontend
    const badgesMapped = badges.map((b) => {
      const ua = unlockedMap.get(b.badgeKey);
      const earned = Boolean(ua);
      //if earned, show 100% progress, else it compute real progress for the progress bar display
      const progress = earned ? { current: 1, target: 1, percent: 100 } : computeBadgeProgress(b, ctx);

      return {
        badgeKey: b.badgeKey,
        badgeName: b.badgeName,
        description: b.description,
        badgeType: b.badgeType,
        category: b.category,
        tier: b.tier,
        badgeCriteria: b.badgeCriteria,
        earned,
        unlockedAt: ua?.unlockedAt || null,
        progress,
      };
    });

    //return summary response used by achievemtns page UI
    return res.json({
      user: {
        id: String(user._id),
        username: user.username,
        role: user.role,
        points: Number(user.points || 0),
      },
      leaderboard: mappedLeaderboard,
      callerRank,
      ledgerPreview: ledgerMapped,
      badges: badgesMapped,
    });
  } catch (err) {
    return sendError(res, err, "Failed to load achievements.");
  }
});

//full points history, used for when user clicks view more button in the UI
//it supports skip (offeset), limit(page size), hasMore (frontend can decide to show load more button)

/**
 * @swagger
 * /achievements/ledger:
 *   get:
 *     summary: Get full points ledger history (pagination with skip/limit)
 */

router.get("/ledger", async (req, res) => {
  try {
    const callerId = requireLoggedIn(req, res);
    if (!callerId) return;

    const role = getRoleQuery(req, res);
    if (!role) return;

    //ensure cller exists and role matches request
    const user = await Users.findById(callerId).lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    if (norm(user.role) !== role) return res.status(403).json({ message: "Not allowed." });

    //pagination input validation and safe caps
    const skip = Math.max(parseInt(req.query.skip || "0", 10), 0);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);

    //queries list with latest first
    const list = await PointsLedger.find({ userId: new mongoose.Types.ObjectId(callerId), role })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

      //total count fro pagination in UI
    const total = await PointsLedger.countDocuments({ userId: new mongoose.Types.ObjectId(callerId), role });

    return res.json({
      items: list.map((x) => ({
        id: String(x._id),
        delta: x.delta,
        reason: x.reason,
        createdAt: x.createdAt,
        meta: x.meta || {},
      })),
      total,
      skip,
      limit,
      hasMore: skip + list.length < total,
    });
  } catch (err) {
    return sendError(res, err, "Failed to load points history.");
  }
});


export default router;