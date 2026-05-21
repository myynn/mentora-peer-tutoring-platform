import http from "./httpClient";

// ObjectId format check 
const isValidId = (id) =>
  typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

// ensure object payload
const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// build query string safely
const qs = (obj) => {
  const sp = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    const val = String(v ?? "").trim();
    if (val) sp.set(k, val);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// API errors so UI always gets a clean message
const wrap = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    // standardise error message for UI
    const msg =
      err?.message ||
      "An unexpected error occurred while communicating with the server.";
    throw new Error(msg);
  }
};


export const usersApi = {
  getAll: () =>
    wrap(() => {
      return http.get("/users");
    }),

  getById: (id) =>
    wrap(() => {
      if (!isValidId(id)) {
        throw new Error("Invalid user ID.");
      }
      return http.get(`/users/${id}`);
    }),

  update: (id, data) =>
    wrap(() => {
      if (!isValidId(id)) {
        throw new Error("Invalid user ID.");
      }

      if (!isPlainObject(data)) {
        throw new Error("Invalid update payload.");
      }

      if (Object.keys(data).length === 0) {
        throw new Error("No update data provided.");
      }

      const forbidden = ["_id", "id", "password", "createdAt"];
      forbidden.forEach((key) => {
        if (key in data) {
          delete data[key];
        }
      });

      return http.put(`/users/${id}`, data);
    }),

  delete: (id) =>
    wrap(() => {
      if (!isValidId(id)) {
        throw new Error("Invalid user ID.");
      }
      return http.delete(`/users/${id}`);
    }),

  listTutors: (filters = {}) =>
    wrap(() => {
      if (filters && typeof filters !== "object") {
        throw new Error("Invalid filters.");
      }
      return http.get(`/users/tutors${qs(filters)}`);
    }),
};