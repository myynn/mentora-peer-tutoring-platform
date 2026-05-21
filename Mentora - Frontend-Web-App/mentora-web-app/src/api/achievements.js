import http from "./httpClient";

//convert any value to a trimmed string, helps avoid bugs when role/params are undefined, null, ensures consistent validation
const asString = (v) => String(v ?? "").trim();
const norm = (v) => asString(v).toLowerCase();

//validates the "role" query param before sending requests, prevents calling backend with invalid role, of either tutor or tutee
const ensureRole = (role) => {
  const r = norm(role);
  if (!r) throw new Error("role is required.");
  if (!["tutor", "tutee"].includes(r)) throw new Error("role must be 'tutor' or 'tutee'.");
  return r;
};

//safely converts values into integers, if conversion fails, returns fallback, used for limit pagination parameters
const toInt = (v, fallback) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

//prevents client from sending extreme values, like limit too large that may slow backend, or nagative numbers which is invalid pagination
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

//frontend calls for achievements feature
//this feature loads the leaderboard data top users based on points, badge prgress and badge unlocked status, points ledger history
export const achievementsApi = {
  //fetches the main achievemtns page data, users points, leadrboard list, badges list, points history
  getSummary(role, ledgerLimit = 3) {
    const r = ensureRole(role);

    //this clamps points history size to 3 to avoid too much data being returned
    const ll = clamp(toInt(ledgerLimit, 3), 1, 20);

    //loads paginated points histroy, the "load more" button
    //skip = how many records already displayed, limit = how many more to fetch
    return http.get(
      `/achievements/summary?role=${encodeURIComponent(r)}&ledgerLimit=${encodeURIComponent(ll)}`
    );
  },

  getLedger(role, skip = 0, limit = 10) {
    const r = ensureRole(role);

    //ensure skip is never negative
    const s = Math.max(toInt(skip, 0), 0);
    //clamp limit so UI cannot request too many at once
    const l = clamp(toInt(limit, 10), 1, 50);

    return http.get(
      `/achievements/ledger?role=${encodeURIComponent(r)}&skip=${encodeURIComponent(
        s
      )}&limit=${encodeURIComponent(l)}`
    );
  },
};

export default achievementsApi;