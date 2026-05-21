// imports
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import storage from "../storage";
import { sessionsApi } from "../api/sessions";
import { usersApi } from "../api/users";
import Spinner from "../components/Spinner";
import SessionTabs from "../components/SessionTabs";
import SessionCard from "../components/SessionCard";
import TutorSessionRequestModal from "../components/TutorSessionRequestModal";
import TutorConfirmAttendanceModal from "../components/TutorConfirmAttendanceModal";
import mentora1 from "../assets/mentora-character.png";
import mentora2 from "../assets/mentora-character2.png";
import "../styles/sessionTabs.css";
import "../styles/sessionCards.css";

//  helpers
const toDateKey = (iso) => String(iso || "").slice(0, 10);
const todayKey = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
const isTodayOrFuture = (iso) => toDateKey(iso) >= todayKey();
const formatShortDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const TutorSessionsPage = () => {
  //  routing
  const navigate = useNavigate();

  //  viewer
  const viewer = useMemo(() => storage.getUser(), []);

  // UI state
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activeTab, setActiveTab] = useState("schedule");

  //  modal UI state
  const [requestOpen, setRequestOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);


  // data
  const [sessions, setSessions] = useState([]);
  const [nameMap, setNameMap] = useState({}); 

  const replaceSessionInList = (updated) => {
    setSessions((prev) =>
      prev.map((x) => (String(x.id) === String(updated.id) ? updated : x))
    );
  };


  //  load sessions + tutee names
  useEffect(() => {
    const load = async () => {
      try {
        setPageError("");
        setLoading(true);

        if (!viewer) {
          setPageError("You are not logged in.");
          setSessions([]);
          return;
        }
        if (viewer.role !== "tutor") {
          setPageError("Only tutor accounts can access this page.");
          setSessions([]);
          return;
        }

        //  fetch all sessions
        const res = await sessionsApi.getByTutorId(viewer.id);
        const mine = Array.isArray(res.data) ? res.data : [];
        setSessions(mine);


        // build map for tutee usernames
        const tuteeIds = [...new Set(mine.map((s) => String(s.tuteeId)).filter(Boolean))];
        if (tuteeIds.length) {
          const calls = tuteeIds.map((id) =>
            usersApi
              .getById(id)
              .then((r) => ({ id, username: r.data?.username || "Tutee" }))
              .catch(() => ({ id, username: "Tutee" }))
          );
          const results = await Promise.all(calls);
          const map = {};
          results.forEach((x) => (map[x.id] = x.username));
          setNameMap(map);
        } else {
          setNameMap({});
        }
      } catch (e) {
        setPageError(e.message || "Failed to load sessions.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [viewer?.id, viewer?.role]);

  //  filters for tabs
  const filtered = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => (a.sessionDate > b.sessionDate ? 1 : -1));

    if (activeTab === "schedule") {
      return sorted.filter(
        (s) => String(s.status || "").toLowerCase() === "confirmed" && isTodayOrFuture(s.sessionDate)
      );
    }

    // confirm sessions for session status pending
    return sorted.filter(
      (s) =>
        String(s.status || "").toLowerCase() === "pending" &&
        isTodayOrFuture(s.sessionDate)
    );
  }, [sessions, activeTab]);

  //  tabs config
  const tabs = [
    { key: "schedule", label: "⏰ My schedule" },
    { key: "confirm", label: "⏳ Session requests" },
  ];

  // UI states
  if (loading) {
    return (
      <div className="sessList">
        <SessionTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
        <Spinner label="Loading sessions..." />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="sessList">
        <SessionTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
        <div className="pageError">{pageError}</div>
      </div>
    );
  }

  if (!filtered.length) {
    const emptyText =
      activeTab === "schedule"
        ? "No confirmed upcoming sessions yet."
        : "No pending session requests right now.";

    const emptyImg = activeTab === "schedule" ? mentora2 : mentora1;

    return (
      <div className="sessList">
        <SessionTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

        <div className="sessEmptyState" style={{ "--empty-img-size": "150px" }}>
          <div>{emptyText}</div>

          <img
            src={emptyImg}
            alt="Mentora character"
            className="sessEmptyImg"
          />
        </div>
      </div>
    );
  }

  //  default render
  return (
    <div className="sessList">
      <SessionTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {filtered.map((s) => {
        const tuteeName = nameMap[String(s.tuteeId)] || "Tutee";

        //  schedule tab
        if (activeTab === "schedule") {
          return (
            <SessionCard
              key={s.id}
              dateLabel={formatShortDate(s.sessionDate)}
              timeRange={s.sessionTimeRange}
              rightLabel="Tutee: "
              rightName={tuteeName}
              status={null}
              lines={[
                { label: "📌Lesson objectives:", value: s.preSessionObjectives },
                { label: "💡Burning questions:", value: Array.isArray(s.preSessionQuestions) ? s.preSessionQuestions.join(", ") : s.preSessionQuestions },
                { label: "🧩Common difficulties:", value: s.preSessionDifficulties },
              ]}
              footerLeftButtons={[
                {
                  label: "View tutee profile",
                  show: true,
                  onClick: () => {
                    navigate(`/tutee/${s.tuteeId}`);
                  },
                },
              ]}
              footerRightButtons={[
                {
                  label: "Confirm attendance",
                  show: true,
                  onClick: () => {
                    setSelectedSession(s);
                    setAttendanceOpen(true);
                  },
                },
              ]}
            />
          );
        }

        //  confirm sessions tab
        return (
          <SessionCard
            key={s.id}
            dateLabel={formatShortDate(s.sessionDate)}
            timeRange={s.sessionTimeRange}
            rightLabel="Tutee: "
            rightName={tuteeName}
            status={null}
            lines={[
              { label: "📌Lesson objectives:", value: s.preSessionObjectives },
              { label: "💡Burning questions:", value: Array.isArray(s.preSessionQuestions) ? s.preSessionQuestions.join(", ") : s.preSessionQuestions },
              { label: "🧩Common difficulties:", value: s.preSessionDifficulties },
            ]}
            footerLeftButtons={[
              {
                label: "View tutee profile",
                show: true,
                onClick: () => {
                  navigate(`/tutee/${s.tuteeId}`);
                },
              },
            ]}
            footerRightButtons={[
              {
                label: "Confirm session request",
                show: true,
                onClick: () => {
                  setSelectedSession(s);
                  setRequestOpen(true);
                },
              },
            ]}
          />
        );
      })}
  <TutorSessionRequestModal
  open={requestOpen}
  onClose={() => setRequestOpen(false)}
  session={selectedSession}
  tuteeName={selectedSession ? (nameMap[String(selectedSession.tuteeId)] || "Tutee") : "Tutee"}
  onSaved={(updated) => replaceSessionInList(updated)}
/>

<TutorConfirmAttendanceModal
  open={attendanceOpen}
  onClose={() => setAttendanceOpen(false)}
  session={selectedSession}
  tuteeName={selectedSession ? (nameMap[String(selectedSession.tuteeId)] || "Tutee") : "Tutee"}
  onSaved={(updated) => replaceSessionInList(updated)}
/>

    </div>
  );
};

export default TutorSessionsPage;