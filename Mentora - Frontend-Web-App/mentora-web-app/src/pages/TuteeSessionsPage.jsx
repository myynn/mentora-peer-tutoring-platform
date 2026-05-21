//imports
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import storage from "../storage";
import { sessionsApi } from "../api/sessions";
import { usersApi } from "../api/users";
import Spinner from "../components/Spinner";
import SessionTabs from "../components/SessionTabs";
import SessionCard from "../components/SessionCard";
import SessionSummaryModal from "../components/SessionSummaryModal";
import ConfirmAttendanceModal from "../components/ConfirmAttendanceModal";
import mentora1 from "../assets/mentora-character.png";
import mentora2 from "../assets/mentora-character2.png";
import "../styles/sessionTabs.css";
import "../styles/sessionCards.css";

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

const TuteeSessionsPage = () => {

  const navigate = useNavigate();

  const viewer = useMemo(() => storage.getUser(), []);
  // ui state
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activeTab, setActiveTab] = useState("booked");

  // data
  const [sessions, setSessions] = useState([]);
  const [nameMap, setNameMap] = useState({});

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const replaceSessionInList = (updated) => {
    setSessions((prev) =>
      prev.map((x) => (String(x.id) === String(updated.id) ? updated : x))
    );
  };

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
        if (viewer.role !== "tutee") {
          setPageError("Only tutee accounts can access this page.");
          setSessions([]);
          return;
        }

        // fetch all sessions
        const res = await sessionsApi.getByTuteeId(viewer.id);
        const mine = Array.isArray(res.data) ? res.data : [];
        setSessions(mine);

        const tutorIds = [...new Set(mine.map((s) => String(s.tutorId)).filter(Boolean))];
        if (tutorIds.length) {
          const calls = tutorIds.map((id) =>
            usersApi
              .getById(id)
              .then((r) => ({ id, username: r.data?.username || "Tutor" }))
              .catch(() => ({ id, username: "Tutor" }))
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

  // filter tabs
  const filtered = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => (a.sessionDate > b.sessionDate ? 1 : -1));

    if (activeTab === "booked") {
      return sorted.filter(
        (s) =>
          ["pending", "confirmed"].includes(String(s.status || "").toLowerCase()) &&
          isTodayOrFuture(s.sessionDate)
      );
    }

    // history
    return sorted.filter((s) => String(s.status || "").toLowerCase() === "completed");
  }, [sessions, activeTab]);

  // tabs configs
  const tabs = [
    { key: "booked", label: "⏰ My booked sessions" },
    { key: "history", label: "🕘 History" },
  ];

  //ui states
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
      activeTab === "booked"
        ? "No upcoming booked sessions yet."
        : "No completed sessions yet.";

    const emptyImg = activeTab === "booked" ? mentora2 : mentora1;

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

  // default state
  return (
    <div className="sessList">
      <SessionTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {filtered.map((s) => {
        const tutorName = nameMap[String(s.tutorId)] || "Tutor";
        const status = String(s.status || "").toLowerCase();

        if (activeTab === "booked") {
          return (
            <SessionCard
              key={s.id}
              dateLabel={formatShortDate(s.sessionDate)}
              timeRange={s.sessionTimeRange}
              rightLabel="Tutor: "
              rightName={tutorName}
              status={status === "pending" ? "Pending" : status === "confirmed" ? "Confirmed" : s.status}
              lines={[
                { label: "📌Lesson objectives:", value: s.preSessionObjectives },
                { label: "💡Burning questions:", value: Array.isArray(s.preSessionQuestions) ? s.preSessionQuestions.join(", ") : s.preSessionQuestions },
                { label: "🧩Common difficulties:", value: s.preSessionDifficulties },
              ]}
              footerLeftButtons={[
                {
                  label: "View tutor profile",
                  show: true,
                  onClick: () => {
                    navigate(`/tutor/${s.tutorId}`);
                  },
                },
              ]}
              footerRightButtons={[
                {
                  label: "Confirm attendance",
                  show: status === "confirmed",
                  onClick: () => {
                    setSelectedSession(s);
                    setAttendanceOpen(true);
                  },
                },
              ]}
            />
          );
        }

        const hasSummary =
          (s.areasCovered && String(s.areasCovered).trim()) ||
          (s.nextLessonGoals && String(s.nextLessonGoals).trim()) ||
          (s.postSessionFeedback && String(s.postSessionFeedback).trim());

        const summaryHint = hasSummary
          ? null
          : "You have not filled in your session summary yet. Please use the “Write session summary” button.";

        const linesForHistory = hasSummary
          ? [
              { label: "📝What was covered:", value: s.areasCovered || "" },
              { label: "🚀Next lesson objective:", value: s.nextLessonGoals || "" },
              { label: "✍️Feedback:", value: s.postSessionFeedback || "" },
            ]
          : [{ type: "hint", value: summaryHint }];

        return (
          <SessionCard
            key={s.id}
            dateLabel={formatShortDate(s.sessionDate)}
            timeRange={s.sessionTimeRange}
            rightLabel="Tutor: "
            rightName={tutorName}
            status={null}
            lines={linesForHistory}

            footerLeftButtons={[
              {
                label: "View tutor profile",
                show: true,
                onClick: () => {
                  navigate(`/tutor/${s.tutorId}`);
                },
              },
            ]}
            footerRightButtons={[
              {
                label: "Write session summary",
                show: true,
                onClick: () => {
                  setSelectedSession(s);
                  setSummaryOpen(true);
                },
              },
            ]}
          />
        );
      })}
      <SessionSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        session={selectedSession}
        onSaved={(updated) => {
          replaceSessionInList(updated);
        }}
      />

      <ConfirmAttendanceModal
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        session={selectedSession}
        tutorName={selectedSession ? (nameMap[String(selectedSession.tutorId)] || "Tutor") : "Tutor"}
        onSaved={(updated) => {
          replaceSessionInList(updated);
        }}
      />
    </div>
  );
};

export default TuteeSessionsPage;