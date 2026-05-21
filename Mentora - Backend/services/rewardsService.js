import mongoose from "mongoose";
import Users from "../models/User.js";
import Session from "../models/Session.js";
import Badge from "../models/Badge.js";
import UserAchievement from "../models/UserAchievement.js";
import PointsLedger from "../models/PointsLedger.js";

//normalise strings for consistent comparisons, which prevents bugs like completed vs Completed
const norm = (v) => String(v || "").trim().toLowerCase();

/**
 * isCompletedSession()
 * Centralised definition of what counts as a completed session
 *
 * A session is considered completed if:
 * 1) status === "completed"
 * OR
 * 2) status === "confirmed" AND both tutor + tutee confirmed attendance
 *
 * This function is reused across:
 * - stats calculations
 * - rewards + points awarding
 * - reliability badge logic
 *
 * This ensures consistency accross the web app
 */
const isCompletedSession = (s) => {
  const st = norm(s.status);
  if (st === "completed") return true;
  if (st === "confirmed" && s.tutorConfirmedAttendance === true && s.tuteeConfirmedAttendance === true) return true;
  return false;
};

const isObjId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

/**
 * safeAddPoints()
 * Atomically handles both:
 * 1) Updating the user's total points
 * 2) Writing a record into PointsLedger
 * 
 * - Users.points is used for  leaderboard sorting
 * - PointsLedger is used for transparency and audit history
 *
 * this is to prevent
 * - Points being updated without a ledger record
 * - Ledger records without actual point balance changes
 */
const safeAddPoints = async ({ userId, role, delta, reason, referenceType, referenceId, meta }) => {
  // step 1, increment user't total points
  await Users.findByIdAndUpdate(
    userId,
    { $inc: { points: delta }, updatedAt: new Date() },
    { new: false }
  );

  //step 2, insert a ledger record for transparency and audit trail
  await PointsLedger.create({
    userId,
    role,
    delta,
    reason,
    referenceType,
    referenceId,
    createdAt: new Date(),
    meta: meta || {},
  });
};

/**
 * safeUnlockBadge()
 * Handles unlocking a badge for a user in 2 places:
 *
 * 1) UserAchievement collection
 *    - Permanent record of when and why badge was unlocked
 *
 * 2) Users.badges array
 *    - copy for profile rendering
 *
 * The unique index on UserAchievement (userId + badgeKey)
 * prevents duplicate unlocks of badges
 */
const safeUnlockBadge = async ({ userId, role, badge }) => {
  // step 1, insert achievement and also store badgeKey inside users.badges for quick profile display
  // if the badge was already unlocked, the unique index will block duplicates
  await UserAchievement.create({
    userId,
    badgeKey: badge.badgeKey,
    badgeType: badge.badgeType,
    unlockedAt: new Date(),
    source: "auto_rewards",
    meta: { category: badge.category, tier: badge.tier },
  });

  //step 2, also store badgekey in users.badges array for fast UI access
  await Users.findByIdAndUpdate(
    userId,
    { $addToSet: { badges: badge.badgeKey }, updatedAt: new Date() },
    { new: false }
  );
};

/**
 * Reliability helpers
 * 
 * These determine whether cancellations affect reliability streak badges
 *
 * if user cancells the streak breaks
 * if other user cancels the steak doesnt break for this user
 */
const isSelfCancelled = (s, role) =>
  norm(s.status) === "cancelled" && norm(s.cancelledBy) === role;

const isOtherCancelled = (s, role) =>
  norm(s.status) === "cancelled" && norm(s.cancelledBy) && norm(s.cancelledBy) !== role;

/**
 * computeReliabilityStreak()
 * 
 * Calculates how many consecutive completed sessions a user has
 * without breaking the streak by cancelling a session
 *
 * This supports reliability streak badges such as:
 * - Complete 3 sessions in a row
 *
 * Algorithm:
 * 1) Sort sessions by most recent activity
 * 2) Count completed sessions
 * 3) Stop streak when user cancells a session
 * 4) Ignore cancellations by the other user
 */
const computeReliabilityStreak = (sessions, role, target) => {
  const sorted = sessions
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  let streak = 0;

  for (const s of sorted) {
    if (isCompletedSession(s)) {
      streak += 1;
      //stop early once badge requirment is satisfied
      if (streak >= target) return target;
      continue;
    }

    //cancelling a session breaks the streak
    if (isSelfCancelled(s, role)) {

      return streak;
    }

    //if other user cancells, it is ignored so doesnt penalise this user
    if (isOtherCancelled(s, role)) {
      continue;
    }

    // ignore pending/confirmed/declined states are ignored
  }

  return streak;
};

/**
 * awardRewardsIfCompleted()
 * 
 * main entry poibt for my gamification system
 *
 * This function is called only when a session is updated into a completed state
 *
 * Responsibilities:
 * 1) Prevent duplicate badge awarding
 * 2) Award  points for session completion +10 points
 * 3) Award milestone bonus points (every 5 sessions) + 30 points
 * 4) Evaluate and unlock eligible badges
 * 5) Mark session as rewardsAwarded to prevent duplicates
 */
export const awardRewardsIfCompleted = async (sessionId) => {
  if (!isObjId(sessionId)) return { didAward: false, message: "Invalid session id." };

  //loads session
  const session = await Session.findById(sessionId).lean();
  if (!session) return { didAward: false, message: "Session not found." };
  //only award badge if session is completed
  if (!isCompletedSession(session)) return { didAward: false, message: "Session is not completed." };

  const tutorId = String(session.tutorId);
  const tuteeId = String(session.tuteeId);

  // Prevent awarding twice for the same session, in case the same session is updated multiple times
  if (session.rewardsAwarded === true) {
    return { didAward: false, message: "Rewards already awarded." };
  }

  // Award points for both tutee and tutor for successfully completing a session +10 points
  await safeAddPoints({
    userId: tutorId,
    role: "tutor",
    delta: 10,
    reason: "session_completed",
    referenceType: "session",
    referenceId: String(session._id),
    meta: {},
  });

  await safeAddPoints({
    userId: tuteeId,
    role: "tutee",
    delta: 10,
    reason: "session_completed",
    referenceType: "session",
    referenceId: String(session._id),
    meta: {},
  });

  // Milestone points, where every 5 completed sessions gives +30 points
  const tutorSessions = await Session.find({ tutorId: new mongoose.Types.ObjectId(tutorId) }).lean();
  const tuteeSessions = await Session.find({ tuteeId: new mongoose.Types.ObjectId(tuteeId) }).lean();

  const tutorCompleted = tutorSessions.filter(isCompletedSession).length;
  const tuteeCompleted = tuteeSessions.filter(isCompletedSession).length;

  //tutor milestone points 
  if (tutorCompleted > 0 && tutorCompleted % 5 === 0) {
    await safeAddPoints({
      userId: tutorId,
      role: "tutor",
      delta: 30,
      reason: "milestone_sessions",
      referenceType: "milestone",
      referenceId: String(session._id),
      meta: { completedSessions: tutorCompleted },
    });
  }

  //tutee milestone points
  if (tuteeCompleted > 0 && tuteeCompleted % 5 === 0) {
    await safeAddPoints({
      userId: tuteeId,
      role: "tutee",
      delta: 30,
      reason: "milestone_sessions",
      referenceType: "milestone",
      referenceId: String(session._id),
      meta: { completedSessions: tuteeCompleted },
    });
  }

  // after points are awarded, we check all badges to seee if the user now qualifies for a badge
  const badges = await Badge.find({}).lean();

  const tutorUser = await Users.findById(tutorId).lean();
  const tuteeUser = await Users.findById(tuteeId).lean();

  // badge evaluation engine
  /**
   * badge categories:
   * - completion: based on completed sessions
   * - points: based on total points
   * - reliability: based on streak of completed sessions
   */
  const tryUnlock = async (user, role, computed) => {
    const eligibleBadges = badges.filter((b) => b.badgeType === "both" || b.badgeType === role);

    for (const b of eligibleBadges) {
      let ok = false;

      //completion badges
      if (b.category === "completion") {
        ok = computed.completedSessions >= b.tier;
      }

      //points badges
      if (b.category === "points") {
        ok = computed.points >= b.tier;
      }

      //reliability badges based on session completion streaks
      if (b.category === "reliability") {
        const target = Number(b.tier || 0);
        if (target <= 0) continue;

        const streak = computeReliabilityStreak(
            role === "tutor" ? tutorSessions : tuteeSessions,
            role,
            target
        );

        ok = streak >= target;
      }

      if (!ok) continue;

      try {
        await safeUnlockBadge({ userId: user._id, role, badge: b });
      } catch (e) {
        if (e?.code === 11000) continue;
        throw e;
      }
    }
  };

  // evaluate tutor badges

    await tryUnlock(tutorUser, "tutor", {
    completedSessions: tutorCompleted,
    points: Number(tutorUser?.points || 0),
  });


  // evaluate tutee badges

    await tryUnlock(tuteeUser, "tutee", {
    completedSessions: tuteeCompleted,
    points: Number(tuteeUser?.points || 0),
   });

  // mark session so rewards are not awarded twice
  await Session.findByIdAndUpdate(
    sessionId,
    { rewardsAwarded: true, rewardsAwardedAt: new Date() },
    { new: false }
  );

  return { didAward: true, message: "Rewards awarded." };
};