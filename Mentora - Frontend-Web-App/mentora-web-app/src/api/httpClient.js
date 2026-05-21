import { config } from "./config";
import storage from "../storage";

const buildUrl = (path) => {
  if (path.startsWith("http")) return path;
  return `${config.BASE_URL}${path}`;
};

const request = async (method, path, body) => {
  // get logged-in user from localStorage
  const user = storage.getUser?.() || null;
  const userId = user?._id || user?.id || null;

  const res = await fetch(buildUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      msg = errData?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return { data };
};

const http = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
};

export default http;