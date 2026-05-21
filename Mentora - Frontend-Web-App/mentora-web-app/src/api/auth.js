import http from "./httpClient";

//api layer validation
const asTrimmed = (v) => String(v ?? "").trim();
const asString = (v) => String(v ?? "");
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? "").trim());

const ensureNonEmpty = (value, fieldLabel) => {
  const v = asTrimmed(value);
  if (!v) throw new Error(`${fieldLabel} is required.`);
  return v;
};

const ensureMaxLen = (value, max, fieldLabel) => {
  const v = asString(value);
  if (v.length > max) throw new Error(`${fieldLabel} must be ${max} characters or fewer.`);
  return v;
};

const ensureMinLen = (value, min, fieldLabel) => {
  const v = asString(value);
  if (v.length < min) throw new Error(`${fieldLabel} must be at least ${min} characters.`);
  return v;
};

const csvToArray = (value) =>
  asString(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const normalizeYearLabel = (v) => {
  const raw = asTrimmed(v);
  if (!raw) return "";
  const m = raw.match(/^(?:Year\s*)?([1-5])$/i);
  if (!m) throw new Error("Year of study must be 1 to 5.");
  return `Year ${m[1]}`;
};

const wrapApiError = (err, fallbackMsg) => {
  const msg = err?.message ? String(err.message) : fallbackMsg;
  return new Error(msg || fallbackMsg);
};

export const authApi = {
//login
  async login({ username, password }) {
    try {
      const u = ensureNonEmpty(username, "Username");
      ensureMaxLen(u, 40, "Username");

      const p = ensureNonEmpty(password, "Password");
      if (p.length > 200) throw new Error("Password looks invalid.");

      return await http.post("/auth/login", {
        username: u,
        password: asString(password),
      });
    } catch (err) {
      throw wrapApiError(err, "Login failed.");
    }
  },

//register tutee
  async registerTutee(payload) {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid registration data.");
      }
      const username = ensureNonEmpty(payload.username, "Username");
      ensureMaxLen(username, 40, "Username");

      const email = ensureNonEmpty(payload.email, "Email");
      if (!isEmail(email)) throw new Error("Email must be a valid email address.");
      ensureMaxLen(email, 120, "Email");

      const password = ensureNonEmpty(payload.password, "Password");
      ensureMinLen(password, 8, "Password");
      if (password.length > 200) throw new Error("Password must be 200 characters or fewer.");

      const schoolName = ensureNonEmpty(payload.schoolName, "School name");
      ensureMaxLen(schoolName, 80, "School name");

      const role = "tutee";

      const yearOfStudy = normalizeYearLabel(payload.yearOfStudy);
      if (!yearOfStudy) throw new Error("Year of study is required.");

      const modulesNeedHelpWith = Array.isArray(payload.modulesNeedHelpWith)
        ? payload.modulesNeedHelpWith.map((x) => asTrimmed(x)).filter(Boolean)
        : csvToArray(payload.modulesNeedHelpWith);

      if (!modulesNeedHelpWith.length) throw new Error("Please enter at least one module/subject.");
      if (modulesNeedHelpWith.join(", ").length > 150) {
        throw new Error("Module/subject must be 150 characters or fewer.");
      }

      const learningStyle = ensureNonEmpty(payload.learningStyle, "Learning style");
      const allowedLearning = ["Visual", "Step-by-step", "Discussion-based"];
      if (!allowedLearning.includes(learningStyle)) {
        throw new Error("Learning style must be Visual, Step-by-step, or Discussion-based.");
      }

      const availableDays = Array.isArray(payload.availableDays)
        ? payload.availableDays.map((x) => asTrimmed(x)).filter(Boolean)
        : csvToArray(payload.availableDays);

      if (!availableDays.length) throw new Error("Availability is required.");
      if (availableDays.join(", ").length > 80) throw new Error("Availability must be 80 characters or fewer.");

      const clean = {
        username,
        email,
        password: asString(payload.password),
        role,
        schoolName,
        yearOfStudy,
        modulesNeedHelpWith,
        learningStyle,
        availableDays,
      };

      return await http.post("/auth/register/tutee", clean);
    } catch (err) {
      throw wrapApiError(err, "Tutee registration failed.");
    }
  },

//register tutor
  async registerTutor(payload) {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid registration data.");
      }
      const username = ensureNonEmpty(payload.username, "Username");
      ensureMaxLen(username, 40, "Username");

      const email = ensureNonEmpty(payload.email, "Email");
      if (!isEmail(email)) throw new Error("Email must be a valid email address.");
      ensureMaxLen(email, 120, "Email");

      const password = ensureNonEmpty(payload.password, "Password");
      ensureMinLen(password, 8, "Password");
      if (password.length > 200) throw new Error("Password must be 200 characters or fewer.");

      const schoolName = ensureNonEmpty(payload.schoolName, "School name");
      ensureMaxLen(schoolName, 80, "School name");

      const role = "tutor";

      const availableDays = Array.isArray(payload.availableDays)
        ? payload.availableDays.map((x) => asTrimmed(x)).filter(Boolean)
        : csvToArray(payload.availableDays);

      if (!availableDays.length) throw new Error("Availability is required.");
      if (availableDays.join(", ").length > 80) throw new Error("Availability must be 80 characters or fewer.");

      // Tutor-specific fields
      const yearLevelsToTeach = Array.isArray(payload.yearLevelsToTeach)
        ? payload.yearLevelsToTeach.map((x) => normalizeYearLabel(x)).filter(Boolean)
        : (payload.yearLevelsToTeach ? [normalizeYearLabel(payload.yearLevelsToTeach)] : []);

      if (!yearLevelsToTeach.length) throw new Error("Year you teach is required.");

      const modulesAbleToTeach = Array.isArray(payload.modulesAbleToTeach)
        ? payload.modulesAbleToTeach.map((x) => asTrimmed(x)).filter(Boolean)
        : csvToArray(payload.modulesAbleToTeach);

      if (!modulesAbleToTeach.length) throw new Error("Please enter at least one module/subject you can teach.");
      if (modulesAbleToTeach.join(", ").length > 80) {
        throw new Error("Module/Subject expertise must be 80 characters or fewer.");
      }

      let gpa = null;
      if (payload.gpa !== null && payload.gpa !== undefined && String(payload.gpa).trim() !== "") {
        const g = Number(payload.gpa);
        if (Number.isNaN(g)) throw new Error("GPA must be a number (e.g., 3.68).");
        if (g < 0 || g > 4) throw new Error("GPA must be between 0.00 and 4.00.");
        gpa = g;
      }

      const shortBio = ensureNonEmpty(payload.shortBio, "Short bio");
      ensureMaxLen(shortBio, 220, "Short bio");

      const teachingStyle = ensureNonEmpty(payload.teachingStyle, "Teaching style");
      const allowedTeaching = ["Visual", "Step-by-step", "Discussion-based"];
      if (!allowedTeaching.includes(teachingStyle)) {
        throw new Error("Teaching style must be Visual, Step-by-step, or Discussion-based.");
      }

      const descriptionTeachApproach = ensureNonEmpty(payload.descriptionTeachApproach, "How you teach");
      ensureMaxLen(descriptionTeachApproach, 600, "How you teach");

      const durationsRaw = Array.isArray(payload.sessionDurationMinutes)
        ? payload.sessionDurationMinutes
        : csvToArray(payload.sessionDurationMinutes);

      const sessionDurationMinutes = durationsRaw
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));

      if (!sessionDurationMinutes.length) {
        throw new Error("Please enter at least one session duration (e.g., 30, 60).");
      }

      const invalid = sessionDurationMinutes.some((n) => !Number.isInteger(n));
      if (invalid) throw new Error("Session duration must be whole numbers only (e.g., 30, 60).");

      const outOfRange = sessionDurationMinutes.some((n) => n < 15 || n > 240);
      if (outOfRange) throw new Error("Session duration must be between 15 and 240 minutes.");

      const clean = {
        username,
        email,
        password: asString(payload.password),
        role,
        schoolName,
        availableDays,
        yearLevelsToTeach,
        modulesAbleToTeach,
        gpa,
        shortBio,
        teachingStyle,
        descriptionTeachApproach,
        sessionDurationMinutes,
      };

      return await http.post("/auth/register/tutor", clean);
    } catch (err) {
      throw wrapApiError(err, "Tutor registration failed.");
    }
  },
};