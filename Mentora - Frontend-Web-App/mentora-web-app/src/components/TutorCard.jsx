import "../styles/tuteeTutors.css";

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase();
};

const starsText = (avg = 0) => {
  const rounded = Math.round(Number(avg || 0));
  return "⭐".repeat(Math.max(0, rounded)) + "☆".repeat(Math.max(0, 5 - rounded));
};

const joinCsv = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");
const joinMinutes = (arr) =>
  Array.isArray(arr) ? arr.map((n) => `${Number(n)} min`).join(", ") : "";

const TutorCard = ({ tutor, onOpenProfile, onBookNow }) => {
  const yearTeach =
    Array.isArray(tutor.yearLevelsToTeach) && tutor.yearLevelsToTeach.length
      ? tutor.yearLevelsToTeach.join(", ")
      : "—";

  const modules = Array.isArray(tutor.modulesAbleToTeach) ? tutor.modulesAbleToTeach : [];
  const days = Array.isArray(tutor.availableDays) ? tutor.availableDays : [];
  const durations = Array.isArray(tutor.sessionDurationMinutes) ? tutor.sessionDurationMinutes : [];

  return (
    <div
      className="tutorCard"
      role="button"
      tabIndex={0}
      onClick={() => onOpenProfile?.(tutor)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpenProfile?.(tutor);
      }}
    >
      <div className="tutorCardLeft">
        <div className="tutorAvatar">{getInitials(tutor.username)}</div>

        <div className="tutorName">{tutor.username || "—"}</div>
        <div className="tutorSchool">{tutor.schoolName || "—"}</div>
        <div className="tutorGpa">GPA: {tutor.gpa ? `${tutor.gpa}/4.0` : "—"}</div>

        <div className="tutorStars">{starsText(tutor.averageRating)}</div>
        <div className="tutorReviews">
          <span className="tutorReviewCount">{Number(tutor.totalRatings || 0)}</span> Reviews
        </div>

        <div className="tutorSessionsBadge">
          Sessions tutored: <b>{Number(tutor.completedSessionsCount || 0)}</b>
        </div>
      </div>

      <div className="tutorCardDivider" />

      <div className="tutorCardRight">
        <div className="tutorTopLine">
          <b>I teach</b> {yearTeach}
          <span className="tutorMiniDivider" aria-hidden="true"></span>
          <b>I use</b> {tutor.teachingStyle ? tutor.teachingStyle.toLowerCase() : "—"} learning!
        </div>

        <div className="tutorModuleChips">
          {modules.length
            ? modules.slice(0, 4).map((m, idx) => (
                <span className="tutorChip" key={`${m}-${idx}`}>
                  {m}
                </span>
              ))
            : <span className="tutorChip muted">No modules</span>}
        </div>

        <div className="tutorBioTitle">Bio</div>
        <div className="tutorBioText">{tutor.shortBio || "—"}</div>

        <div className="tutorMeta">
          <div>
            <b>Session duration:</b> {durations.length ? joinMinutes(durations) : "—"}
          </div>
          <div>
            <b>Availability:</b> {days.length ? joinCsv(days) : "—"}
          </div>
        </div>

        <button
          className="tutorBookBtn"
          onClick={(e) => {
            e.stopPropagation();
            onBookNow?.(tutor);
          }}
          type="button"
        >
          Book now
        </button>
      </div>
    </div>
  );
};

export default TutorCard;