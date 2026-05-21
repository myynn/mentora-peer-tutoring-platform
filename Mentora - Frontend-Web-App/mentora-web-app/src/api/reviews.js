import http from "./httpClient";

const isValidId = (id) =>
  typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const normStr = (v) => String(v ?? "").trim();

const isValidRating = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5;
};

const isValidComment = (v) => {
  const s = normStr(v);
  if (!s) return false;
  if (s.length > 180) return false;

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 30) return false;

  return true;
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

export const reviewsApi = {

  create: (data) =>
    wrap(() => {
      if (!isPlainObject(data)) throw new Error("Invalid review payload.");

      const tutorId = normStr(data.tutorId);
      const tuteeId = normStr(data.tuteeId);

      if (!isValidId(tutorId)) throw new Error("Invalid tutor ID.");
      if (!isValidId(tuteeId)) throw new Error("Invalid tutee ID.");

      if (!isValidRating(data.rating)) {
        throw new Error("Rating must be a whole number between 1 and 5.");
      }

      if (!isValidComment(data.comment)) {
        throw new Error(
          "Comment is required and must be under 180 characters and 30 words."
        );
      }

      if (data.createdAt) {
        const d = new Date(data.createdAt);
        if (Number.isNaN(d.getTime())) {
          throw new Error("Invalid createdAt timestamp.");
        }
      }

      return http.post("/reviews", data);
    }),

  getByTutorId: (tutorId) =>
    wrap(() => {
      const tid = normStr(tutorId);
      if (!isValidId(tid)) throw new Error("Invalid tutor ID.");
      return http.get(`/reviews?tutorId=${encodeURIComponent(tid)}`);
    }),

  update: (id, data) =>
    wrap(() => {
      if (!isValidId(id)) throw new Error("Invalid review ID.");
      if (!isPlainObject(data)) throw new Error("Invalid update payload.");
      if (Object.keys(data).length === 0) throw new Error("No update data provided.");

      if ("rating" in data && !isValidRating(data.rating)) {
        throw new Error("Rating must be a whole number between 1 and 5.");
      }

      if ("comment" in data && !isValidComment(data.comment)) {
        throw new Error(
          "Comment must be under 180 characters and 30 words."
        );
      }

      delete data._id;
      delete data.id;
      delete data.tutorId;
      delete data.tuteeId;

      return http.put(`/reviews/${encodeURIComponent(id)}`, data);
    }),

  remove: (id) =>
    wrap(() => {
      if (!isValidId(id)) throw new Error("Invalid review ID.");
      return http.delete(`/reviews/${encodeURIComponent(id)}`);
    }),
};