import { useEffect, useMemo, useState } from "react";
import achievementsApi from "../api/achievements";
import Button from "../components/Button";
import LeaderboardPodium from "../components/LeaderboardPodium";
import PointsHistory from "../components/PointsHistory";
import BadgeCard from "../components/BadgeCard";
import "../styles/achievements.css";
import bookLeft from "../assets/booksleft.png";
import bookRight from "../assets/booksright.png";

const TutorAchievementsPage = () => {
  const role = "tutor";

  // core ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // data state
  const [summary, setSummary] = useState(null);

  // ledger pagination state
  const [ledgerItems, setLedgerItems] = useState([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerSkip, setLedgerSkip] = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ledgerCollapsed, setLedgerCollapsed] = useState(true);

  const leaderboardTop3 = useMemo(() => (summary?.leaderboard || []).slice(0, 3), [summary]);
  const leaderboardRest = useMemo(() => (summary?.leaderboard || []).slice(3), [summary]);
  const badges = useMemo(() => summary?.badges || [], [summary]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await achievementsApi.getSummary(role);
      setSummary(res.data);

      const preview = Array.isArray(res.data.ledgerPreview) ? res.data.ledgerPreview : [];
      setLedgerItems(preview);
      setLedgerSkip(preview.length);
      setLedgerHasMore(preview.length >= 3);
      setLedgerCollapsed(true);
    } catch (e) {
      setError(e.message || "Failed to load achievements.");
    } finally {
      setLoading(false);
    }
  };

  const handleShowLess = async () => {
    try {
        setError("");
        const res = await achievementsApi.getSummary(role);
        const preview = Array.isArray(res.data.ledgerPreview) ? res.data.ledgerPreview : [];
        setLedgerItems(preview);
        setLedgerSkip(preview.length);
        setLedgerHasMore(preview.length >= 3);
        setLedgerCollapsed(true);
    } catch (e) {
        setError(e.message || "Failed to collapse points history.");
    }
  };

  useEffect(() => {
    loadSummary();
    // no dependency needed because role is constant for this page
  }, []);

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      setError("");

      const res = await achievementsApi.getLedger(role, ledgerSkip, 10);
      const incoming = Array.isArray(res.data.items) ? res.data.items : [];

      setLedgerItems((prev) => [...prev, ...incoming]);
      setLedgerTotal(res.data.total || 0);

      const nextSkip = ledgerSkip + incoming.length;
      setLedgerSkip(nextSkip);
      setLedgerHasMore(Boolean(res.data.hasMore));
      setLedgerCollapsed(false);
    } catch (e) {
      setError(e.message || "Failed to load more points history.");
    } finally {
      setLoadingMore(false);
    }
  };

  // loading state
  if (loading) {
    return (
      <div className="achPage">
        <h2 className="achTitle">Achievements</h2>
        <div className="loadingBox">Loading your achievements...</div>
      </div>
    );
  }

  // error state
  if (error && !summary) {
    return (
      <div className="achPage">
        <h2 className="achTitle">Achievements</h2>
        <div className="errorBox">{error}</div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={loadSummary}>Retry</Button>
        </div>
      </div>
    );
  }

  const totalPoints = summary?.user?.points ?? 0;

  return (
    <div className="achPage">
      <h2 className="achTitle">Leaderboard</h2>

      <LeaderboardPodium leaderboard={leaderboardTop3} />

      <div className="leaderboardList">
        {leaderboardRest.length === 0 ? (
          <div className="emptyBox">No more users yet.</div>
        ) : (
          leaderboardRest.map((x) => (
            <div className="leaderRow" key={x.id}>
              <div className="leaderLeft">
                <div className="leaderRank">#{x.rank}</div>
                <div className="leaderAvatar">{String(x.username || "U").slice(0, 1).toUpperCase()}</div>
                <div className="leaderName">{x.username}</div>
              </div>
              <div className="leaderPoints">🏅 {x.points} points</div>
            </div>
          ))
        )}
      </div>

      <h2 className="achTitle" style={{ marginTop: 20 }}>Your points</h2>

      <div className="pointsSummaryWrap">
              <img
                  src={bookLeft}
                  alt="Left decoration"
                  className="pointsSummarySideImg pointsSummarySideImgLeft"
              />
      
              <div className="pointsSummaryCard">
                  <div className="pointsSummaryLabel">Total points</div>
                  <div className="pointsSummaryValue">{totalPoints}</div>
                  <div className="pointsSummaryHint">Keep up the good work!</div>
              </div>
      
              <img
                  src={bookRight}
                  alt="Right decoration"
                  className="pointsSummarySideImg pointsSummarySideImgRight"
              />
     </div>
      <div className="pointsHistoryWrap">
        <PointsHistory items={ledgerItems} />

        <div className="pointsLoadMore">
            {!ledgerCollapsed ? (
                <Button onClick={handleShowLess}>
                Show less
                </Button>
            ) : null}

            {ledgerHasMore ? (
                <Button onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : "Load more"}
                </Button>
            ) : null}
        </div>

        {error ? <div className="errorBox" style={{ marginTop: 10 }}>{error}</div> : null}
      </div>

      <h2 className="achTitle" style={{ marginTop: 20 }}>Badges & achievements</h2>

      {badges.length === 0 ? (
        <div className="emptyBox">No badges found. Please check your badges collection.</div>
      ) : (
        <div className="badgesGrid">
          {badges.map((b) => (
            <BadgeCard key={b.badgeKey} badge={b} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorAchievementsPage;