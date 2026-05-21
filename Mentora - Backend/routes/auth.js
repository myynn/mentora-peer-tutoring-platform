import express from "express";
import Users from "../models/User.js";

const router = express.Router();

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const wordCount = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const asString = (v) => String(v ?? "").trim();

const asStringArray = (v) => (Array.isArray(v) ? v.map((x) => asString(x)).filter(Boolean) : []);

const totalTextLength = (arr) => asStringArray(arr).join(", ").length;

const firstError = (errorsObj) => {
  const key = Object.keys(errorsObj)[0];
  return key ? errorsObj[key] : "";
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user (returns user id, username, role)
 */

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const user = await Users.findOne({ username, password }).lean();
    if (!user) return res.status(401).json({ message: "Invalid username or password." });

    return res.status(200).json({
      id: String(user._id),
      _id: String(user._id),
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    return sendError(res, err, "Login failed.");
  }
});

/**
 * @swagger
 * /auth/register/tutee:
 *   post:
 *     summary: Register a new tutee account
 */

router.post("/register/tutee", async (req, res) => {
  try {
    const { username, email, password, schoolName, yearOfStudy, modulesNeedHelpWith, learningStyle, availableDays } =
      req.body;

    const errors = {};
    const u = asString(username);
    const e = asString(email);

    if (!u) errors.username = "Please enter a username.";
    else if (u.length > 40) errors.username = "Username must be 40 characters or fewer.";

    if (!e) errors.email = "Please enter your email.";
    else if (!isEmail(e)) errors.email = "Please enter a valid email address.";

    if (!password) errors.password = "Please create a password.";
    else if (String(password).length < 8) errors.password = "Password must be at least 8 characters.";

    if (!asString(schoolName)) errors.schoolName = "Please enter your school name.";

    if (!asString(yearOfStudy)) errors.yearOfStudy = "Please select your year of study.";

    const modsArr = asStringArray(modulesNeedHelpWith);
    if (modsArr.length === 0) errors.modulesNeedHelpWith = "Please enter at least one module/subject.";
    else if (totalTextLength(modsArr) > 150)
        errors.modulesNeedHelpWith = "Module/subject must be 150 characters or fewer.";

    if (!asString(learningStyle)) errors.learningStyle = "Please select your learning style.";

    const daysArr = asStringArray(availableDays);
    if (daysArr.length === 0) errors.availableDays = "Please enter your availability.";

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ message: firstError(errors), errors });
    }

    const usernameExists = await Users.findOne({ username: u }).lean();
    if (usernameExists) return res.status(409).json({ message: "This username is already taken." });

    const emailExists = await Users.findOne({ email: e }).lean();
    if (emailExists) return res.status(409).json({ message: "This email is already registered." });

    const now = new Date();

    const newUser = await Users.create({
      username: u,
      email: e,
      password,
      role: "tutee",

      schoolName: schoolName || "",
      yearOfStudy: yearOfStudy || "",
      modulesNeedHelpWith: modsArr,
      availableDays: daysArr,
      learningStyle: learningStyle || "",

      yearLevelsToTeach: [],
      modulesAbleToTeach: [],
      shortBio: "",
      gpa: null,
      teachingStyle: "",
      descriptionTeachApproach: "",
      sessionDurationMinutes: [],

      averageRating: 0,
      totalRatings: 0,
      completedSessionsCount: 0,
      attendanceRate: 100,
      badges: [],
      points: 0,
      cancelledSessionsCount: 0,
      lastWarningAt: 0,

      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      id: String(newUser._id),
      _id: String(newUser._id),
      username: newUser.username,
      role: newUser.role,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || "field";
      return res.status(409).json({ message: `${field} already exists.` });
    }

    if (err?.name === "ValidationError") {
      const firstMsg = Object.values(err.errors || {})[0]?.message || "Validation failed.";
      return res.status(400).json({ message: firstMsg, errors: err.errors });
    }

    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * @swagger
 * /auth/register/tutor:
 *   post:
 *     summary: Register a new tutor account
 */

router.post("/register/tutor", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      schoolName,
      yearLevelsToTeach,
      modulesAbleToTeach,
      gpa,
      shortBio,
      teachingStyle,
      descriptionTeachApproach,
      availableDays,
      sessionDurationMinutes,
    } = req.body;

    const errors = {};
    const u = asString(username);
    const e = asString(email);

    if (!u) errors.username = "Please enter a username.";
    else if (u.length > 40) errors.username = "Username must be 40 characters or fewer.";

    if (!e) errors.email = "Please enter your email.";
    else if (!isEmail(e)) errors.email = "Please enter a valid email address.";

    if (!password) errors.password = "Please create a password.";
    else if (String(password).length < 8) errors.password = "Password must be at least 8 characters.";

    if (!asString(schoolName)) errors.schoolName = "Please enter your school name.";

    const yearsArr = asStringArray(yearLevelsToTeach);
    if (yearsArr.length === 0) errors.yearLevelsToTeach = "Please select the year level you teach.";

    const teachModsArr = asStringArray(modulesAbleToTeach);
    if (teachModsArr.length === 0) errors.modulesAbleToTeach = "Please enter at least one module/subject you can teach.";
    else if (totalTextLength(teachModsArr) > 80) errors.modulesAbleToTeach = "Module list must be 80 characters or fewer.";

    if (asString(gpa)) {
    const g = Number(gpa);
    if (Number.isNaN(g)) errors.gpa = "GPA must be a number (e.g., 3.68).";
    else if (g < 0 || g > 4) errors.gpa = "GPA must be between 0.00 and 4.00.";
    }

    if (!asString(shortBio)) errors.shortBio = "Please write a short bio so tutees can understand you better.";
    else if (wordCount(shortBio) > 30) errors.shortBio = "Short bio must be 30 words or fewer.";

    if (!asString(teachingStyle)) errors.teachingStyle = "Please select your teaching style.";

    if (!asString(descriptionTeachApproach)) errors.descriptionTeachApproach = "Please describe your teaching approach.";
    else if (wordCount(descriptionTeachApproach) > 80) errors.descriptionTeachApproach = "How you teach must be 80 words or fewer.";

    const daysArr = asStringArray(availableDays);
    if (daysArr.length === 0) errors.availableDays = "Please enter your availability.";

    const durationsArr = Array.isArray(sessionDurationMinutes) ? sessionDurationMinutes : [];
    if (durationsArr.length === 0) {
    errors.sessionDurationMinutes = "Please enter at least one session duration (e.g., 30, 60).";
    } else {
    const invalid = durationsArr.some((d) => !Number.isInteger(Number(d)));
    if (invalid) {
        errors.sessionDurationMinutes = "Session duration must be whole numbers only (e.g., 30, 60).";
    } else {
        const outOfRange = durationsArr.some((d) => Number(d) < 15 || Number(d) > 240);
        if (outOfRange) errors.sessionDurationMinutes = "Session duration must be between 15 and 240 minutes.";
    }
    }

    if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: firstError(errors), errors });
    }

    const usernameExists = await Users.findOne({ username: u }).lean();
    if (usernameExists) return res.status(409).json({ message: "This username is already taken." });

    const emailExists = await Users.findOne({ email: e }).lean();
    if (emailExists) return res.status(409).json({ message: "This email is already registered." });

    const now = new Date();

    const newUser = await Users.create({
      username: u,
      email: e,
      password,
      role: "tutor",

      schoolName: schoolName || "",
      yearLevelsToTeach: yearsArr,
      modulesAbleToTeach: teachModsArr,
      gpa: asString(gpa) ? Number(gpa) : null,
      shortBio: shortBio || "",
      teachingStyle: teachingStyle || "",
      descriptionTeachApproach: descriptionTeachApproach || "",
      availableDays: daysArr,
      sessionDurationMinutes: durationsArr.map((n) => Number(n)),

      yearOfStudy: "",
      modulesNeedHelpWith: [],
      learningStyle: "",

      averageRating: 0,
      totalRatings: 0,
      completedSessionsCount: 0,
      attendanceRate: 100,
      badges: [],
      points: 0,
      cancelledSessionsCount: 0,
      lastWarningAt: 0,

      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      id: String(newUser._id),
      _id: String(newUser._id),
      username: newUser.username,
      role: newUser.role,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || "field";
      return res.status(409).json({ message: `${field} already exists.` });
    }

    if (err?.name === "ValidationError") {
      const firstMsg = Object.values(err.errors || {})[0]?.message || "Validation failed.";
      return res.status(400).json({ message: firstMsg, errors: err.errors });
    }

    return res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;