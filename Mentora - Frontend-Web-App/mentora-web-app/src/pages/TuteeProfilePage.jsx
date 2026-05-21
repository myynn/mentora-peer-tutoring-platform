// imports
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useLocation } from "react-router";
import storage from "../storage";
import { usersApi } from "../api/users";
import { sessionsApi } from "../api/sessions";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import "../styles/profile.css";
import BadgeCard from "../components/BadgeCard";
import "../styles/achievements.css";
import { badgesApi } from "../api/badges";

const TuteeProfilePage = () => {
  //  routing hooks
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const refreshKey = location.state?.refreshKey;


  // logged in user from localStorage
  const [viewer] = useState(() => storage.getUser());

  const profileId = useMemo(() => {
    return params?.id ? params.id : viewer?.id;
  }, [params?.id, viewer?.id]);

  // ui states
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [profile, setProfile] = useState(null);

  const [attendedCount, setAttendedCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);

  const [badgeObjects, setBadgeObjects] = useState([]);

  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0][0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const computeAttendanceBreakdown = (sessions) => {
    const counted = (sessions || []).filter((s) => {
      const st = String(s.status || "").toLowerCase();
      return st === "completed" || st === "cancelled";
    });

    const attended = counted.filter((s) => s.tuteeConfirmedAttendance === true).length;
    const missed = counted.length - attended;

    return { attended, missed };
  };

  //load profile data
  useEffect(() => {
    const load = async () => {
      try {
        setPageError("");
        setLoading(true);

        if (!viewer) {
          setPageError("You are not logged in.");
          setProfile(null);
          return;
        }
        if (!profileId) {
          setPageError("Profile not found.");
          setProfile(null);
          return;
        }

        const res = await usersApi.getById(profileId);
        const user = res.data;

        if (!user) {
          setProfile(null);
          return;
        }

        if (user.role !== "tutee") {
          setPageError("This profile is not a tutee profile.");
          setProfile(null);
          return;
        }

        setProfile(user);

        const keys = (user.badges || []).map((x) => String(x).trim()).filter(Boolean);

        if (keys.length === 0) {
          setBadgeObjects([]);
        } else {
          const res2 = await badgesApi.getByKeys(keys);
          const badges = Array.isArray(res2.data) ? res2.data : [];
          setBadgeObjects(badges.map((b) => ({ ...b, earned: true })));
        }

        setAttendedCount(Number(user.completedSessionsCount || 0));
        setMissedCount(Number(user.cancelledSessionsCount || 0));

      } catch (err) {
        setPageError(err.message || "Failed to load profile.");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profileId, refreshKey]);

  const isOwner = viewer && profile && String(viewer.id) === String(profile.id);
  const headerTitle = isOwner ? "Your tutee profile" : "Tutee's profile";
  const showEditBtn = isOwner && viewer?.role === "tutee";

  const pointsEarned = Number(profile?.points || 0);


  const goBack = () => navigate(-1);
  const goEdit = () => navigate("/tutee/profile/edit");

  // loading state
  if (loading) {
    return (
      <div className="profilePage">
        <div className="profileHeader">
          <button className="backArrow" onClick={goBack} aria-label="Back">←</button>
          <div className="headerTitle">{headerTitle}</div>
          <div className="headerRight" />
        </div>

        <div className="profileCenter">
          <Spinner label="Loading profile..." />
        </div>
      </div>
    );
  }

  // error state
  if (pageError) {
    return (
      <div className="profilePage">
        <div className="profileHeader">
          <button className="backArrow" onClick={goBack} aria-label="Back">←</button>
          <div className="headerTitle">{headerTitle}</div>
          <div className="headerRight" />
        </div>

        <div className="profileCenter">
          <div className="pageError">{pageError}</div>
          <Button variant="secondary" onClick={goBack}>Go back</Button>
        </div>
      </div>
    );
  }

  //empty state
  if (!profile) {
    return (
      <div className="profilePage">
        <div className="profileHeader">
          <button className="backArrow" onClick={goBack} aria-label="Back">←</button>
          <div className="headerTitle">{headerTitle}</div>
          <div className="headerRight" />
        </div>

        <div className="profileCenter">
          <div className="emptyState">Profile not found.</div>
          <Button variant="secondary" onClick={goBack}>Go back</Button>
        </div>
      </div>
    );
  }

  // default state
  return (
    <div className="profilePage">

      <div className="profileHeader">
        <button className="backArrow" onClick={goBack} aria-label="Back">←</button>

        <div className="headerTitle">{headerTitle}</div>

        <div className="headerRight">
          {showEditBtn ? (
            <Button className="editBtn" onClick={goEdit}>
              Edit profile
            </Button>
          ) : null}
        </div>
      </div>

      <div className="profileGrid">
        <div className="leftCard">
          <div className="avatarCircle">{getInitials(profile.username)}</div>

          <div className="leftStats">
            <div className="ratePill">
              Attendance rate: {Number(profile.attendanceRate ?? 100).toFixed(0)}%
            </div>

            <div className="statLine">Sessions attended: {attendedCount}</div>
            <div className="statLine">Sessions missed: {missedCount}</div>

            <div className="pointsGap" />

            <div className="pointsPill">Points earned: {pointsEarned}</div>
          </div>

        </div>

        <div className="rightCol">
          <div className="infoCard">
            <div className="name">{profile.username}</div>
            <div className="school">{profile.schoolName}</div>
            <div className="yearOfStudy">
              {profile.yearOfStudy ? profile.yearOfStudy : "Year of study not set"}
            </div>

            <div className="roleRow">
              <span className="roleText">Tutee</span>
              <span className="divider">|</span>
              <span className="styleText">
                I am a {profile.learningStyle ? profile.learningStyle.toLowerCase() : "..." } learner!
              </span>
            </div>
          </div>

          <div className="sectionBlock">
            <div className="sectionHeading">I need help with</div>

            {profile.modulesNeedHelpWith?.length ? (
              <div className="chipWrap">
                {profile.modulesNeedHelpWith.map((m, idx) => (
                  <span className="chipYellow" key={`${m}-${idx}`}>{m}</span>
                ))}
              </div>
            ) : (
              <div className="emptyInline">No modules added yet.</div>
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionHeading">I am available</div>

            {profile.availableDays?.length ? (
              <div className="chipWrap">
                {profile.availableDays.map((d, idx) => (
                  <span className="chipBlue" key={`${d}-${idx}`}>{d}</span>
                ))}
              </div>
            ) : (
              <div className="emptyInline">No availability added yet.</div>
            )}
          </div>
        </div>
      </div>
      <div className="badgesSection">
        <div className="badgesTitle">Badges earned</div>

        {badgeObjects.length ? (
          <div className="badgesScroller">
            {badgeObjects.map((b) => (
              <BadgeCard key={b.badgeKey} badge={b} />
            ))}
          </div>
        ) : (
          <div className="emptyInline">No badges earned yet.</div>
        )}
      </div>
    </div>
  );
};

export default TuteeProfilePage;
