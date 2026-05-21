import http from "./httpClient";

const asString = (v) => String(v ?? "").trim();
const isObjId = (v) => /^[a-f\d]{24}$/i.test(asString(v));

const ensureObjId = (name, v) => {
  const id = asString(v);
  if (!id) throw new Error(`${name} is required.`);
  if (!isObjId(id)) throw new Error(`Invalid ${name}.`);
  return id;
};

export const statsApi = {
  // Backend recomputes tutor averageRating + totalRatings
  recomputeTutorRating(tutorId) {
    const id = ensureObjId("tutorId", tutorId);
    return http.post(`/stats/recomputeTutorRating/${encodeURIComponent(id)}`);
  },

  // Backend recomputes tutor attendanceRate + completedSessionsCount
  recomputeTutorStats(tutorId) {
    return http.post(`/stats/recomputeTutorStats/${encodeURIComponent(tutorId)}`);
  },

  // Backend recomputes tutee attendanceRate + completedSessionsCount + cancelledSessionsCount
  recomputeTuteeStats(tuteeId) {
    const id = ensureObjId("tuteeId", tuteeId);
    return http.post(`/stats/recomputeTuteeStats/${encodeURIComponent(id)}`);
  },
};

export default statsApi;