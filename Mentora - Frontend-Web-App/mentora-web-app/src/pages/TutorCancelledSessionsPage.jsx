// imports
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import storage from "../storage";
import { usersApi } from "../api/users";
import { sessionsApi } from "../api/sessions";
import Spinner from "../components/Spinner";
import SessionCard from "../components/SessionCard";
import mentoraCharacter2 from "../assets/mentora-character2.png";
import "../styles/settingsPage.css";
import "../styles/sessionCards.css";


const formatShortDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const TutorCancelledSessionsPage = () => {
  //  routing 
  const navigate = useNavigate();

  const viewer = useMemo(() => storage.getUser(), []);

  //  UI state
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  //  data state
  const [sessions, setSessions] = useState([]);
  const [userMap, setUserMap] = useState({}); 

  //  load cancelled sessions
  useEffect(() => {
    const load = async () => {
      try {
        //  reset ui states
        setPageError("");
        setLoading(true);

        if (!viewer) {
          setSessions([]);
          return;
        }

        if (viewer.role !== "tutor") {
          setPageError("Only tutor accounts can access this page.");
          setSessions([]);
          return;
        }


        //  fetch tutor sessions
        const sRes = await sessionsApi.getByTutorId(viewer.id);
        const mine = Array.isArray(sRes.data) ? sRes.data : [];

        //  filter only cancelled sessions status
        const cancelledOnly = mine
          .filter((s) => String(s.status || "").toLowerCase() === "cancelled")
          .sort((a, b) => (String(a.sessionDate) > String(b.sessionDate) ? 1 : -1));

        setSessions(cancelledOnly);

        const ids = new Set();

        cancelledOnly.forEach((s) => {
          if (s?.tuteeId) ids.add(String(s.tuteeId));
          if (s?.tutorId) ids.add(String(s.tutorId));
        });

        const idList = [...ids];

        if (!idList.length) {
          setUserMap({});
          return;
        }

        const calls = idList.map((id) =>
          usersApi
            .getById(id)
            .then((r) => ({
              id,
              username: r.data?.username || "User",
              role: r.data?.role || "",
            }))
            .catch(() => ({ id, username: "User", role: "" }))
        );

        const results = await Promise.all(calls);

        const map = {};
        results.forEach((x) => {
          map[String(x.id)] = { username: x.username, role: x.role };
        });
        setUserMap(map);
      } catch (e) {
        setPageError(e.message || "Failed to load cancelled sessions.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [viewer?.id, viewer?.role]);

  const goBack = () => navigate(-1);

  const viewTuteeProfile = (tuteeId) => {

    navigate(`/tutee/${tuteeId}`);
  };

  const getCancelledByText = (s) => {

    const byField = String(s.cancelledBy || "").toLowerCase();
    const inferredBy =
      byField ||
      (s.tuteeConfirmedAttendance === false ? "tutee"
        : s.tutorConfirmedAttendance === false ? "tutor"
        : "");

    if (inferredBy === "tutee") {
      const info = userMap[String(s.tuteeId)];
      const name = info?.username || "Tutee";
      const role = info?.role || "tutee";
      return `Cancelled by: ${name} (${role})`;
    }

    if (inferredBy === "tutor") {
      const info = userMap[String(s.tutorId)];
      const name = info?.username || "Tutor";
      const role = info?.role || "tutor";
      return `Cancelled by: ${name} (${role})`;
    }

    return "Cancelled by: —";
  };

  //loading state
  if (loading) {
    return (
      <div className="setPage">
        <div className="setTopBar">
          <button className="setBack" onClick={goBack} aria-label="Back">←</button>
          <div className="setTitle">Your cancelled sessions</div>
          <div className="setTopRight" />
        </div>

        <div className="setCenter">
          <Spinner label="Loading cancelled sessions..." />
        </div>
      </div>
    );
  }

  //error state
  if (pageError) {
    return (
      <div className="setPage">
        <div className="setTopBar">
          <button className="setBack" onClick={goBack} aria-label="Back">←</button>
          <div className="setTitle">Your cancelled sessions</div>
          <div className="setTopRight" />
        </div>

        <div className="setCenter">
          <div className="pageError">{pageError}</div>
          <button className="setBtnGhost" onClick={goBack}>Go back</button>
        </div>
      </div>
    );
  }

  // empty state
  if (!viewer) {
    return (
      <div className="setPage">
        <div className="setTopBar">
          <button className="setBack" onClick={goBack} aria-label="Back">←</button>
          <div className="setTitle">Your cancelled sessions</div>
          <div className="setTopRight" />
        </div>

        <div className="setCenter">
          <div style={{ textAlign: "center", opacity: 0.85 }}>You are not logged in.</div>
          <button
            className="setBtnGhost"
            onClick={() => navigate("/tutor/login", { replace: true })}
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  // default state
  return (
    <div className="setPage">
      <div className="setTopBar">
        <button className="setBack" onClick={goBack} aria-label="Back">←</button>
        <div className="setTitle">Your cancelled sessions</div>
        <div className="setTopRight" />
      </div>

      <div className="setInner">

        <div style={{ height: 10 }} />

        {!sessions.length ? (
          <div className="setEmptyState" style={{ "--empty-img-size": "150px" }}>
            <div>No cancelled sessions yet.</div>

            <img
              src={mentoraCharacter2}
              alt="Mentora character"
              className="setEmptyImg"
            />
          </div>
        ) : (
          sessions.map((s) => {
            const tuteeInfo = userMap[String(s.tuteeId)];
            const tuteeName = tuteeInfo?.username || "Tutee";

            return (
              <SessionCard
                key={s.id}
                dateLabel={formatShortDate(s.sessionDate)}
                timeRange={s.sessionTimeRange}
                rightLabel="Tutee: "
                rightName={tuteeName}

                pillText={getCancelledByText(s)}
                status={null}

                lines={[
                  { label: "📌Lesson objectives:", value: s.preSessionObjectives },
                  {
                    label: "💡Burning questions:",
                    value: Array.isArray(s.preSessionQuestions)
                      ? s.preSessionQuestions.join(", ")
                      : s.preSessionQuestions,
                  },
                  { label: "🧩Common difficulties:", value: s.preSessionDifficulties },
                ]}

                footerLeftButtons={[
                  {
                    label: "View tutee profile",
                    show: true,
                    onClick: () => viewTuteeProfile(s.tuteeId),
                  },
                ]}

                footerRightButtons={[]}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default TutorCancelledSessionsPage;