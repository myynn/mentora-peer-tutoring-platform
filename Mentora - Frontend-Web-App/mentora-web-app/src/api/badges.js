import http from "./httpClient";

//convert any vlaue to a clean trimmed string
const asString = (v) => String(v ?? "").trim();

//badge key format must match backend validation and schema, lowercase letters, numbers, underscore only, length 2-60
const KEY_RE = /^[a-z0-9_]{2,60}$/;
//prevent huge requests that might slow down backend
const MAX_KEYS = 30;

const normalizeKeys = (keys) => {
  let arr = [];

  if (Array.isArray(keys)) {
    arr = keys;
  } else if (typeof keys === "string") {
    arr = keys.split(",");
  } else if (keys != null) {
    arr = [String(keys)];
  }

  const cleaned = arr
    .map((k) => asString(k))
    .filter(Boolean);

  const unique = [...new Set(cleaned)];

  if (!unique.length) {
    throw new Error("No badge keys provided.");
  }

  if (unique.length > MAX_KEYS) {
    throw new Error(`Too many badge keys. Max allowed is ${MAX_KEYS}.`);
  }

  //validate each key matches schema format
  const invalid = unique.filter((k) => !KEY_RE.test(k));
  if (invalid.length) {
    throw new Error(
      "One or more badge keys are invalid. Use lowercase letters, numbers, underscores (2-60 chars)."
    );
  }

  return unique;
};

export const badgesApi = {
  //retrieves badge metadata for a list of badge keys, frontend only has badgekey references and needs full badge info, like name, description, categroy, tier
  getByKeys: (keys) => {
    const uniqueKeys = normalizeKeys(keys);
    const joined = uniqueKeys.join(",");
    //sends keys to backend as query param, url-encoded safely
    return http.get(`/badges?keys=${encodeURIComponent(joined)}`);
  },
};

export default badgesApi;