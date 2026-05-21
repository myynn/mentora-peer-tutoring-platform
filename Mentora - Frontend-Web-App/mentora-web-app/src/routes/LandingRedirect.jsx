// 1. imports
import { Navigate } from "react-router";
import storage from "../storage";

// 2. component: decides where "/" should go
const LandingRedirect = () => {
  // 3. read user from localstorage
  const user = storage.getUser();

  // 4. if not logged in -> go to default login
  if (!user) return <Navigate to="/tutee/login" replace />;

  // 5. if logged in -> go to role home
  if (user.role === "tutor") return <Navigate to="/tutor/sessions" replace />;

  // 6. default fallback
  return <Navigate to="/tutee/tutors" replace />;
};

export default LandingRedirect;
