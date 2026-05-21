import "./../styles/achievements.css";

//converts date into a short label for point histroy list
const formatShortDate = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
};

//converts backend reason codes into human readable labeld, ensures UI displays friendly labels even though backend stores enum codes
const getReasonLabel = (reason) => {
  if (reason === "session_completed") return "Session completed";
  if (reason === "milestone_sessions") return "Milestone: 5 sessions";
  return "Points earned";
};

//matches reason codes with icons so user can see icon
const getReasonIcon = (reason) => {
  if (reason === "session_completed") return "emoji_events";
  if (reason === "milestone_sessions") return "workspace_premium";
  return "stars";
};

//dsplays the user's poitns ledger as a histroy list, data comes from backend pointsledger collection
//each row explains wy points were earned (reason), when points were earned (createdAt), how many poitns were earned (delta)
const PointsHistory = ({ items }) => {
  const list = Array.isArray(items) ? items : [];

  //empty stat when user has not earned points yet
  if (list.length === 0) {
    return <div className="emptyBox">No points history yet. Complete a session to earn points.</div>;
  }

  return (
    <div className="pointsList">
      {list.map((x) => (
        <div className="pointsItem" key={x.id}>
          <div className="pointsIconWrap">
            <span className="material-symbols-outlined pointsIcon">
              {getReasonIcon(x.reason)}
            </span>
          </div>

          <div className="pointsText">
            <div className="pointsReason">{getReasonLabel(x.reason)}</div>
            <div className="pointsDate">{formatShortDate(x.createdAt)}</div>
          </div>

          <div className="pointsDelta">+{x.delta}</div>
        </div>
      ))}
    </div>
  );
};

export default PointsHistory;