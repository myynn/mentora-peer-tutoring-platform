import "./../styles/achievements.css";

//create simple avatar using initials from username of user
const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] || "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
};

//displays one user indside podium UI
const PodiumCircle = ({ user, rank }) => {
  const initials = getInitials(user?.username);
  return (
    <div className={`podiumCircle podium${rank}`}>
      {rank === 1 ? <div className="podiumCrown">👑</div> : null}
      <div className="podiumAvatar">{initials}</div>
      <div className="podiumName">{user?.username || "-"}</div>
      <div className="podiumPoints">🏅 {user?.points ?? 0} points</div>
      <div className="podiumRank">{rank}</div>
    </div>
  );
};

//displays top 3 users as a podium, backend provides leaderboard array already sorted by points desc order, if no data exists, show an empty state message
const LeaderboardPodium = ({ leaderboard }) => {
  const list = Array.isArray(leaderboard) ? leaderboard : [];
  const first = list[0] || null;
  const second = list[1] || null;
  const third = list[2] || null;

  //empty stat if leaderboard has no entries
  if (!first && !second && !third) {
    return <div className="emptyBox">No leaderboard data yet.</div>;
  }

  return (
    <div className="podiumRow">
      <PodiumCircle user={second} rank={2} />
      <PodiumCircle user={first} rank={1} />
      <PodiumCircle user={third} rank={3} />
    </div>
  );
};

export default LeaderboardPodium;