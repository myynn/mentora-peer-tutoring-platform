
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import storage from "../storage";
import { sessionsApi } from "../api/sessions";
import { usersApi } from "../api/users";
import Spinner from "../components/Spinner";
import SessionCard from "../components/SessionCard";
import mentoraCharacter from "../assets/mentora-character.png";
import "../styles/sessionCards.css";

// helpers
const formatShortDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const TutorHistoryPage = () => {
  const navigate = useNavigate();
  const viewer = useMemo(() => storage.getUser(), []);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [nameMap, setNameMap] = useState({});

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

        //  load all sessions for tutor
        const res = await sessionsApi.getByTutorId(viewer.id);
        const mine = Array.isArray(res.data) ? res.data : [];

        //only sessions that status is completed
        const completed = mine.filter(
          (s) => String(s.status || "").toLowerCase() === "completed"
        );

        completed.sort((a, b) => (a.sessionDate > b.sessionDate ? 1 : -1));
        setSessions(completed);

        const tuteeIds = [
          ...new Set(completed.map((s) => String(s.tuteeId)).filter(Boolean)),
        ];

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
        setPageError(e.message || "Failed to load session history.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [viewer?.id, viewer?.role]);

  if (loading) {
    return (
      <div className="sessList">
        <Spinner label="Loading session history..." />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="sessList">
        <div className="pageError">{pageError}</div>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="sessList">
        <div className="setEmptyState" style={{ "--empty-img-size": "150px" }}>
          <div>No completed sessions yet.</div>

          <img
            src={mentoraCharacter}
            alt="Mentora character"
            className="setEmptyImg"
          />
        </div>
      </div>
    );
  }


  return (
    <div className="sessList">
      {sessions.map((s) => {
        const tuteeName = nameMap[String(s.tuteeId)] || "Tutee";

        const hasSummary =
          (s.areasCovered && String(s.areasCovered).trim()) ||
          (s.nextLessonGoals && String(s.nextLessonGoals).trim()) ||
          (s.postSessionFeedback && String(s.postSessionFeedback).trim());

        const summaryHint =
          "Session summary not submitted yet. Please ask your tutee to fill it in using the session summary form.";

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
            rightLabel="Tutee:"
            rightName={tuteeName}
            status={null}
            lines={linesForHistory}
            footerLeftButtons={[
              {
                label: "View tutee profile",
                show: true,
                onClick: () => navigate(`/tutee/${s.tuteeId}`),
              },
            ]}
            footerRightButtons={[]}
          />
        );
      })}
    </div>
  );
};

export default TutorHistoryPage;