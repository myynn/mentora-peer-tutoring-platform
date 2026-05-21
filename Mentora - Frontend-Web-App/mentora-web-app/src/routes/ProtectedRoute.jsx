// 1. protected route guard
import { Navigate, Outlet } from "react-router";
import storage from "../storage";

export default function ProtectedRoute({ allowedRoles = [], redirectTo }) {
  // 2. read user from localStorage
  const user = storage.getUser();

  // 3. Not logged in -> send to login
  if (!user) return <Navigate to={redirectTo} replace />;

  // 4. role mismatch -> send them to their correct home
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const fallback = user.role === "tutor" ? "/tutor/sessions" : "/tutee/tutors";
    return <Navigate to={fallback} replace />;
  }

  // 5. OK -> render child route
  return <Outlet />;
}
