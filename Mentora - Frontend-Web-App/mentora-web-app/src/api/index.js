
import { usersApi } from "./users";
import { sessionsApi } from "./sessions";
import { reviewsApi } from "./reviews";
import { statsApi } from "./stats";

import { authApi } from "./auth";

export const api = {
  users: usersApi,
  sessions: sessionsApi,
  reviews: reviewsApi,
  stats: statsApi,
  auth: authApi,
};