import http from "./httpClient";

const asString = (v) => String(v ?? "").trim();

const isNonEmpty = (v) => asString(v).length > 0;

const isObjId = (v) => /^[a-f\d]{24}$/i.test(asString(v));

const ensureObjId = (name, v) => {
  const val = asString(v);
  if (!val) throw new Error(`${name} is required.`);
  if (!isObjId(val)) throw new Error(`Invalid ${name}.`);
  return val;
};

const STATUS = ["pending", "confirmed", "cancelled", "completed", "declined"];
const CANCELLED_BY = ["tutor", "tutee", null];

const isValidTimeRange = (v) => {
  const re =
    /^\d{1,2}([:.]\d{2})\s?(am|pm)\s?-\s?\d{1,2}([:.]\d{2})\s?(am|pm)$/i;
  return re.test(asString(v));
};

const toIsoDate = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid sessionDate.");
  return d.toISOString();
};

export const sessionsApi = {
  create: (data) => {
    if (!data || typeof data !== "object") throw new Error("Missing session payload.");

    // required ids
    ensureObjId("tutorId", data.tutorId);
    ensureObjId("tuteeId", data.tuteeId);

    if (data.slotId !== undefined && data.slotId !== null && asString(data.slotId) !== "") {
      ensureObjId("slotId", data.slotId);
    }

    // require date and time
    if (!isNonEmpty(data.sessionDate)) throw new Error("sessionDate is required.");
    toIsoDate(data.sessionDate);

    if (!isNonEmpty(data.sessionTimeRange)) throw new Error("sessionTimeRange is required.");

    // required pre session fields
    if (!isNonEmpty(data.preSessionObjectives))
      throw new Error("Please fill in your lesson objectives.");

    const qs = Array.isArray(data.preSessionQuestions) ? data.preSessionQuestions : [];
    if (!qs.length) throw new Error("Please fill in your burning questions.");

    if (!isNonEmpty(data.preSessionDifficulties))
      throw new Error("Please fill in your common difficulties.");

    return http.post("/sessions", data);
  },

  getAll: () => http.get("/sessions"),

  getById: (id) => {
    const sid = ensureObjId("session id", id);
    return http.get(`/sessions/${encodeURIComponent(sid)}`);
  },

  getByTutorId: (tutorId) => {
    const tid = ensureObjId("tutorId", tutorId);
    return http.get(`/sessions?tutorId=${encodeURIComponent(tid)}`);
  },

  getByTuteeId: (tuteeId) => {
    const tid = ensureObjId("tuteeId", tuteeId);
    return http.get(`/sessions?tuteeId=${encodeURIComponent(tid)}`);
  },

  update: (id, patch) => {
    const sid = ensureObjId("session id", id);
    if (!patch || typeof patch !== "object") throw new Error("Missing update payload.");

    if (patch.status !== undefined) {
      const st = asString(patch.status).toLowerCase();
      if (!STATUS.includes(st)) throw new Error("Invalid status.");
    }

    if (patch.cancelledBy !== undefined) {
      const by = patch.cancelledBy === null ? null : asString(patch.cancelledBy).toLowerCase();
      if (!CANCELLED_BY.includes(by)) throw new Error("Invalid cancelledBy.");
    }

    // Attendance must be boolean if provided
    if (patch.tutorConfirmedAttendance !== undefined && typeof patch.tutorConfirmedAttendance !== "boolean") {
      throw new Error("tutorConfirmedAttendance must be a boolean.");
    }
    if (patch.tuteeConfirmedAttendance !== undefined && typeof patch.tuteeConfirmedAttendance !== "boolean") {
      throw new Error("tuteeConfirmedAttendance must be a boolean.");
    }

    ["areasCovered", "nextLessonGoals", "postSessionFeedback"].forEach((k) => {
      if (patch[k] !== undefined && typeof patch[k] !== "string") {
        throw new Error(`${k} must be a string.`);
      }
    });

    return http.put(`/sessions/${encodeURIComponent(sid)}`, patch);
  },

  delete: (id) => {
    const sid = ensureObjId("session id", id);
    return http.delete(`/sessions/${encodeURIComponent(sid)}`);
  },
};