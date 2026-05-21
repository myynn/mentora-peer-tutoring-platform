import http from "./httpClient";

const isValidId = (id) =>
  typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const normStr = (v) => String(v ?? "").trim();

const isValidIsoDate = (v) => {
  const s = normStr(v);
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
};

const isValidTimeRange = (v) => {
  const s = normStr(v);
  return s.length >= 3 && s.length <= 60;
};

// API errors so UI always gets a clean message
const wrap = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    throw new Error(
      err?.message ||
        "An unexpected error occurred while communicating with the server."
    );
  }
};

export const availabilitySlotsApi = {
  create: (data) =>
    wrap(() => {
      if (!isPlainObject(data)) throw new Error("Invalid slot payload.");

      const tutorId = normStr(data.tutorId);
      if (!isValidId(tutorId)) throw new Error("Invalid tutor ID.");

      if (!isValidIsoDate(data.slotDate)) {
        throw new Error("Invalid slotDate. Please select a valid date.");
      }

      if (!isValidTimeRange(data.timeRange)) {
        throw new Error("Invalid time range.");
      }

      if ("isBooked" in data && typeof data.isBooked !== "boolean") {
        throw new Error("Invalid isBooked value.");
      }

      if ("sessionId" in data && data.sessionId !== null && data.sessionId !== "") {
        const sid = normStr(data.sessionId);
        if (!isValidId(sid)) throw new Error("Invalid session ID.");
      }

      return http.post("/availabilitySlots", data);
    }),

  getAll: () =>
    wrap(() => {
      return http.get("/availabilitySlots");
    }),

  getById: (id) =>
    wrap(() => {
      if (!isValidId(id)) throw new Error("Invalid availability slot ID.");
      return http.get(`/availabilitySlots/${id}`);
    }),

  update: (id, data) =>
    wrap(() => {
      if (!isValidId(id)) throw new Error("Invalid availability slot ID.");
      if (!isPlainObject(data)) throw new Error("Invalid update payload.");
      if (Object.keys(data).length === 0) throw new Error("No update data provided.");

      if ("tutorId" in data) {
        const tid = normStr(data.tutorId);
        if (!isValidId(tid)) throw new Error("Invalid tutor ID.");
      }

      if ("slotDate" in data && data.slotDate) {
        if (!isValidIsoDate(data.slotDate)) throw new Error("Invalid slotDate.");
      }

      if ("timeRange" in data && data.timeRange) {
        if (!isValidTimeRange(data.timeRange)) throw new Error("Invalid time range.");
      }

      if ("isBooked" in data && typeof data.isBooked !== "boolean") {
        throw new Error("Invalid isBooked value.");
      }

      if ("sessionId" in data && data.sessionId !== null && data.sessionId !== "") {
        const sid = normStr(data.sessionId);
        if (!isValidId(sid)) throw new Error("Invalid session ID.");
      }

      // prevent accidental overwrites of ids
      delete data._id;
      delete data.id;

      return http.put(`/availabilitySlots/${id}`, data);
    }),

  getByTutorId: (tutorId) =>
    wrap(() => {
      const tid = normStr(tutorId);
      if (!isValidId(tid)) throw new Error("Invalid tutor ID.");
      return http.get(`/availabilitySlots?tutorId=${encodeURIComponent(tid)}`);
    }),

  getBySessionId: (sessionId) =>
    wrap(() => {
      const sid = normStr(sessionId);
      if (!isValidId(sid)) throw new Error("Invalid session ID.");
      return http.get(`/availabilitySlots?sessionId=${encodeURIComponent(sid)}`);
    }),
};