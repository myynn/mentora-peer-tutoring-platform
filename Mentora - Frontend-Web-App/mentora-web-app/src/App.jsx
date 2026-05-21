//  imports
import { Routes, Route } from "react-router";
import TuteeLogin from "./pages/TuteeLogin";
import TutorLogin from "./pages/TutorLogin";
import TuteeRegister from "./pages/TuteeRegister";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import TutorRegister from "./pages/TutorRegister";
import LandingRedirect from "./routes/LandingRedirect";
import ProtectedLayoutWithNav from "./routes/ProtectedLayout";
import ProtectedLayoutPlain from "./routes/ProtectedLayoutPlain";
import TuteeTutors from "./pages/TuteeTutorsPage";
import TuteeSessions from "./pages/TuteeSessionsPage";
import TutorSessions from "./pages/TutorSessionsPage";
import TutorHistory from "./pages/TutorHistoryPage";
import TuteeProfilePage from "./pages/TuteeProfilePage";
import TutorProfilePage from "./pages/TutorProfilePage";
import TuteeSettingsPage from "./pages/TuteeSettingsPage";
import TutorSettingsPage from "./pages/TutorSettingsPage";
import TuteeEditProfilePage from "./pages/TuteeEditProfilePage";
import TutorEditProfilePage from "./pages/TutorEditProfilePage";
import BookSessionPage from "./pages/BookSessionPage";
import TuteeCancelledSessionsPage from "./pages/TuteeCancelledSessionsPage";
import TutorCancelledSessionsPage from "./pages/TutorCancelledSessionsPage";
import TuteeAchievementsPage from "./pages/TuteeAchievementsPage";
import TutorAchievementsPage from "./pages/TutorAchievementsPage";

const App = () => {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<LandingRedirect />} />

      {/* Public routes */}
      <Route path="/tutee/login" element={<TuteeLogin />} />
      <Route path="/tutor/login" element={<TutorLogin />} />
      <Route path="/tutee/register" element={<TuteeRegister />} />
      <Route path="/tutor/register" element={<TutorRegister />} />

      {/*  Protected tutee routes */}
      <Route element={<ProtectedRoute allowedRoles={["tutee"]} redirectTo="/tutee/login" />}>
        {/*  pages with top nav bar */}
        <Route element={<ProtectedLayoutWithNav />}>
          <Route path="/tutee/tutors" element={<TuteeTutors />} />
          <Route path="/tutee/sessions" element={<TuteeSessions />} />
          <Route path="/tutee/achievements" element={<TuteeAchievementsPage />} />
        </Route>

        {/* pages without top nav bar*/}
        <Route element={<ProtectedLayoutPlain />}>
          <Route path="/tutee/profile" element={<TuteeProfilePage />} />
          <Route path="/tutee/settings" element={<TuteeSettingsPage />} />
          <Route path="/tutee/profile/edit" element={<TuteeEditProfilePage />} />
          <Route path="/tutor/:id" element={<TutorProfilePage />} />
          <Route path="/tutee/book/:tutorId" element={<BookSessionPage />} />
          <Route path="/tutee/cancelled-sessions" element={<TuteeCancelledSessionsPage />} />
        </Route>
      </Route>

      {/*  Protected tutor routes */}
      <Route element={<ProtectedRoute allowedRoles={["tutor"]} redirectTo="/tutor/login" />}>
        <Route element={<ProtectedLayoutWithNav />}>
          <Route path="/tutor/sessions" element={<TutorSessions />} />
          <Route path="/tutor/history" element={<TutorHistory />} />
          <Route path="/tutor/achievements" element={<TutorAchievementsPage />} />
        </Route>
        {/* pages without top nav bar */}
        <Route element={<ProtectedLayoutPlain />}>
          <Route path="/tutor/profile" element={<TutorProfilePage />} />
          <Route path="/tutor/settings" element={<TutorSettingsPage />} />
          <Route path="/tutor/profile/edit" element={<TutorEditProfilePage />} />
          <Route path="/tutee/:id" element={<TuteeProfilePage />} />
          <Route path="/tutor/cancelled-sessions" element={<TutorCancelledSessionsPage />} />
        </Route>
      </Route>

      {/*  Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;

