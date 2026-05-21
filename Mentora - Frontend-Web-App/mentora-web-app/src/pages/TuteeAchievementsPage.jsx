import { useEffect, useMemo, useState } from "react";
import achievementsApi from "../api/achievements";
import Button from "../components/Button";
import LeaderboardPodium from "../components/LeaderboardPodium";
import PointsHistory from "../components/PointsHistory";
import BadgeCard from "../components/BadgeCard";
import "../styles/achievements.css";
import bookLeft from "../assets/booksleft.png";
import bookRight from "../assets/booksright.png";

//tutee achievements page with my gamification additional feature, same as my tutor achievements page

//points system earned via completed sessions and miletstone points every completed sessions in multiples of 5
//leaderboard ranked by points
//points history for users to view how they earned their points
//badge system, whether they earned the badge or the badge is locked with a progrress bar showing the user's progress to earning that badge
//datais loaded from backend endpoints, GET /achievements/summary, and GET /achievements/ledger
const TuteeAchievementsPage = () => {
  const role = "tutee";

  //loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //summary holds the main payload from /achievements/summary, including user points, leaderboard list, callerRank, ledgerPreview, badges
  const [summary, setSummary] = useState(null);

  //ledgerItems = currently displayed points history, ledgerSkip =  how many points already fetched also used as skip offest, ledgerHasMore = whether backend indicates more results exist
  //loadingMore = disables button and sohws "loading", ledgerCollapsed = UI state used for "Show less"
  const [ledgerItems, setLedgerItems] = useState([]);
  const [ledgerSkip, setLedgerSkip] = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ledgerCollapsed, setLedgerCollapsed] = useState(true);

  //use memo is used to avoid recomputing slices on every re-render
  //we split leaderboard into top 3 and rest of the users in a norma list according to points earned
  const leaderboardTop3 = useMemo(() => (summary?.leaderboard || []).slice(0, 3), [summary]);
  const leaderboardRest = useMemo(() => (summary?.leaderboard || []).slice(3), [summary]);
  const badges = useMemo(() => summary?.badges || [], [summary]);

  //loads the achievements summary data from backend, leaderboard, badge list, ledgerPreview, also resets ledger state back to preview mode, which is used on initial page load when user clicks retry after error
  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");

      //fetch summary from backend
      const res = await achievementsApi.getSummary(role);
      //store main summary payload
      setSummary(res.data);

      //the backend provides a small preview of ledger items, with only 3 points items which makes initial page load faster
      const preview = Array.isArray(res.data.ledgerPreview) ? res.data.ledgerPreview : [];
      //show preview initially
      setLedgerItems(preview);
      //i set a skip to the number we already loaded
      setLedgerSkip(preview.length);
      //if preview is full size of more than or equals to 3, there might be more items
      setLedgerHasMore(preview.length >= 3);
      //ledger starts collapsed in preview mode
      setLedgerCollapsed(true);
    } catch (e) {
      setError(e.message || "Failed to load achievements.");
    } finally {
      setLoading(false);
    }
  };

  //collapses the ledger back to preview mode
  //instead of slicing the exisiting list, we reload summary preview, ensuring that preview is always consistent with backend, avoids UI mismatch if ledger udpaes later
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

  //useeffect on mount, loads achievements data when page first renders
  useEffect(() => {
    loadSummary();
  }, []);

  //loads the next page of ledger items using GET /achievements/ledger?skip=X&limit=10, then appends results into ledgerItems
  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      setError("");

      const res = await achievementsApi.getLedger(role, ledgerSkip, 10);
      const incoming = Array.isArray(res.data.items) ? res.data.items : [];

      //append new records to existing list
      setLedgerItems((prev) => [...prev, ...incoming]);

      //update skip so next request fetches the correct page
      const nextSkip = ledgerSkip + incoming.length;
      setLedgerSkip(nextSkip);
      //backend tells us if more records exist
      setLedgerHasMore(Boolean(res.data.hasMore));
      //once more is loaded, ledger is considered expanded
      setLedgerCollapsed(false);
    } catch (e) {
      setError(e.message || "Failed to load more points history.");
    } finally {
      setLoadingMore(false);
    }
  };

  //loading UI state
  if (loading) {
    return (
      <div className="achPage">
        <h2 className="achTitle">Achievements</h2>
        <div className="loadingBox">Loading your achievements...</div>
      </div>
    );
  }

  //error state
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

  //points shown in total points section, comes directly from backend Users.points
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

      {/*your points section */}
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
      {/* points history section*/}
      <div className="pointsHistoryWrap">
        <PointsHistory items={ledgerItems} />
         {/*load more/ show less control buttons */}
        <div className="pointsLoadMore">
            {!ledgerCollapsed ? (
                <Button onClick={handleShowLess}>
                Show less
                </Button>
            ) : null}
            {/*load more appears only when backend says mre exists */}
            {ledgerHasMore ? (
                <Button onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : "Load more"}
                </Button>
            ) : null}
        </div>

        {error ? <div className="errorBox" style={{ marginTop: 10 }}>{error}</div> : null}
      </div>
      {/* badges section*/}
      <h2 className="achTitle" style={{ marginTop: 20 }}>Badges & achievements</h2>
       {/*badge empty state */}
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

export default TuteeAchievementsPage;