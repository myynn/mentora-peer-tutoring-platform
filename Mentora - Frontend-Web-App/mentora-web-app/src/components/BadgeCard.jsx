import "./../styles/achievements.css";

//converts backend unlockedAt date into a readable format, returns empty string if data is missing or invalid
const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
};

//maps badge category to a icon, to keep badge icons consistent and category based
const getBadgeIconText = (category) => {
  if (category === "completion") return "emoji_events";
  if (category === "reliability") return "verified";
  if (category === "monthly") return "calendar_month";
  if (category === "points") return "stars";
  return "workspace_premium";
};

//displays one badge with earned badge showing completed and unlocked date, locked bdage shows progress bar
//progress bar values are computed by backedn
const BadgeCard = ({ badge }) => {
  //earned is boolean by backedn
  const earned = Boolean(badge?.earned);

  //progress.percent is calculated by backend
  const percent = Math.max(0, Math.min(100, Number(badge?.progress?.percent || 0)));

  //these are displayed as current/target
  const current = badge?.progress?.current ?? 0;
  const target = badge?.progress?.target ?? 0;

  return (
    <div className={`badgeCard ${earned ? "badgeEarned" : "badgeLocked"}`}>
      <div className="badgeTop">
        <div className={`badgeIconWrap ${earned ? "iconEarned" : "iconLocked"}`}>
          <span className="material-symbols-outlined badgeIcon">
            {getBadgeIconText(badge?.category)}
          </span>
        </div>

        <div className="badgeTitleWrap">
          <div className="badgeName">{badge?.badgeName || "Badge"}</div>
          <div className="badgeDesc">{badge?.description || ""}</div>
        </div>
      </div>

      <div className="badgeBottom">
        {earned ? (
        <div className="badgeDone">
            <div className="badgeDoneText">Completed</div>
            <div className="badgeDoneDate">{formatDate(badge?.unlockedAt)}</div>
        </div>
        ) : (
        <>
            <div className="badgeProgressRow">
            <div className="badgeProgressBar">
                <div className="badgeProgressFill" style={{ width: `${percent}%` }} />
            </div>

            <div className="badgeProgressText">
                {target > 0 ? `${current} / ${target}` : `${percent}%`}
            </div>
            </div>
        </>
        )}
      </div>
    </div>
  );
};

export default BadgeCard;