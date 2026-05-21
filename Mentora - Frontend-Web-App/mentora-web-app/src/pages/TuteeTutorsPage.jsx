import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import storage from "../storage";
import { usersApi } from "../api/users";
import Spinner from "../components/Spinner";
import Button from "../components/Button";
import SearchBar from "../components/SearchBar";
import FilterPillSelect from "../components/FilterPillSelect";
import TutorRow from "../components/TutorRow";
import menotoraCharacter from "../assets/mentora-character.png";
import "../styles/tuteeTutors.css";

const contains = (hay, needle) =>
  String(hay || "")
    .toLowerCase()
    .includes(String(needle || "").toLowerCase());

const TuteeTutorsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const viewer = useMemo(() => storage.getUser(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  // UI states
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [tutors, setTutors] = useState([]);

  // Query params
  const q = searchParams.get("q") || "";
  const module = searchParams.get("module") || "";
  const minRating = searchParams.get("minRating") || "";
  const style = searchParams.get("style") || "";
  const day = searchParams.get("day") || "";
  const duration = searchParams.get("duration") || "";
  const year = searchParams.get("year") || "";
  const sort = searchParams.get("sort") || "relevance";

  const [searchText, setSearchText] = useState(q);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => setSearchText(q), [q]);

  const updateParams = (patch) => {
    const sp = new URLSearchParams(searchParams);

    Object.entries(patch).forEach(([k, v]) => {
      const val = String(v ?? "").trim();
      if (!val) sp.delete(k);
      else sp.set(k, val);
    });

    setSearchParams(sp, { replace: true });
  };

  const clearAll = () => {
    setSearchText("");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  useEffect(() => {
    if (searchText === q) return;

    setIsSearching(true);
    const t = setTimeout(() => {
      updateParams({ q: searchText });
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(t);

  }, [searchText]);

  // load tutor details
  useEffect(() => {
    const load = async () => {
      try {
        setPageError("");
        setLoading(true);

        if (!viewer) {
          setPageError("You are not logged in.");
          setTutors([]);
          return;
        }
        if (viewer.role !== "tutee") {
          setPageError("Only tutee accounts can access this page.");
          setTutors([]);
          return;
        }

        const res = await usersApi.listTutors({
          q,
          module,
          minRating,
          style,
          day,
          duration,
          year,
          sort,
          limit: 200,
        });
        setTutors(Array.isArray(res.data) ? res.data : []);

      } catch (err) {
        setPageError(err.message || "Failed to load tutors.");
        setTutors([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [viewer?.id, viewer?.role]);

  // filtering
  const filtered = useMemo(() => {
    let out = tutors || [];

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((t) => {
        const usernameOk = contains(t.username, needle);
        const modulesOk =
          Array.isArray(t.modulesAbleToTeach) && t.modulesAbleToTeach.some((m) => contains(m, needle));
        const daysOk =
          Array.isArray(t.availableDays) && t.availableDays.some((d) => contains(d, needle));
        return usernameOk || modulesOk || daysOk;
      });
    }

    if (module) {
      const m = module.toLowerCase();
      out = out.filter(
        (t) =>
          Array.isArray(t.modulesAbleToTeach) &&
          t.modulesAbleToTeach.some((x) => String(x).toLowerCase().includes(m))
      );
    }

    if (minRating) {
      const mr = Number(minRating);
      out = out.filter((t) => Number(t.averageRating || 0) >= mr);
    }

    if (style) out = out.filter((t) => String(t.teachingStyle || "") === style);

    if (day) {
      const d = day.toLowerCase();
      out = out.filter(
        (t) => Array.isArray(t.availableDays) && t.availableDays.some((x) => String(x).toLowerCase().includes(d))
      );
    }

    if (duration) {
      const dur = Number(duration);
      out = out.filter(
        (t) => Array.isArray(t.sessionDurationMinutes) && t.sessionDurationMinutes.some((n) => Number(n) === dur)
      );
    }

    if (year) {
      const y = `Year ${year}`;
      out = out.filter((t) => Array.isArray(t.yearLevelsToTeach) && t.yearLevelsToTeach.includes(y));
    }

    if (sort === "rating") {
      out = [...out].sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
    } else if (sort === "new") {
      out = [...out].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return out;
  }, [tutors, q, module, minRating, style, day, duration, year, sort]);

  const topTutors = useMemo(() => {
    return [...filtered].sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0)).slice(0, 10);
  }, [filtered]);

  const newlyJoined = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);
  }, [filtered]);

  const allTutors = useMemo(() => filtered.slice(0, 20), [filtered]);

  const openProfile = (tutor) => navigate(`/tutor/${tutor.id}`);
    const bookNow = (tutor) => {
    navigate(`/tutee/book/${tutor.id}`, {
      state: { from: location.pathname },
    });
  };


  const moduleOptions = useMemo(() => {
    const set = new Set();
    (tutors || []).forEach((t) => (t.modulesAbleToTeach || []).forEach((m) => set.add(String(m))));
    const list = [...set].sort((a, b) => a.localeCompare(b));
    return [{ label: "Any", value: "" }, ...list.map((m) => ({ label: m, value: m }))];
  }, [tutors]);

  if (loading) {
    return (
      <div className="ttPage">
        <div className="ttCenterBox">
          <Spinner label="Loading tutors..." />
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="ttPage">
        <div className="ttCenterBox">
          <div className="ttErrorBox">{pageError}</div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ttPage">
      <div className="ttHero">
        <div className="ttHeroTitle">Find your perfect tutor</div>
        <div className="ttHeroSubtitle">Learn with peer tutors who understand your learning journey</div>

        <SearchBar
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search for tutors, modules, or availability..."
        />

        {isSearching ? (
          <div className="ttSearchingRow">
            <Spinner label="Searching..." />
          </div>
        ) : null}
      </div>

      <div className="ttFilterBar">
        <div className="ttFilterLabelRow">
          <span className="ttFilterBy">Filter by:</span>
          <span className="ttFilterLine" />
        </div>

        <div className="ttFilterPillsRow">
          <FilterPillSelect
            label="Modules"
            icon="📚"
            value={module}
            onChange={(val) => updateParams({ module: val })}
            options={moduleOptions}
          />

          <FilterPillSelect
            label="Tutor rating"
            icon="⭐"
            value={minRating}
            onChange={(val) => updateParams({ minRating: val })}
            options={[
              { label: "4+ stars", value: "4" },
              { label: "3+ stars", value: "3" },
              { label: "2+ stars", value: "2" },
              { label: "1+ stars", value: "1" },
              { label: "Clear filter", value: "" },
            ]}
          />

          <FilterPillSelect
            label="Teaching style"
            icon="🎯"
            value={style}
            onChange={(val) => updateParams({ style: val })}
            options={[
              { label: "Visual", value: "Visual" },
              { label: "Step-by-step", value: "Step-by-step" },
              { label: "Discussion-based", value: "Discussion-based" },
              { label: "Clear filter", value: "" },
            ]}
          />

          <FilterPillSelect
            label="Availability"
            icon="📅"
            value={day}
            onChange={(val) => updateParams({ day: val })}
            options={[
              { label: "Mon", value: "Mon" },
              { label: "Tue", value: "Tue" },
              { label: "Wed", value: "Wed" },
              { label: "Thu", value: "Thu" },
              { label: "Fri", value: "Fri" },
              { label: "Sat", value: "Sat" },
              { label: "Sun", value: "Sun" },
              { label: "Clear filter", value: "" },
            ]}
          />

          <FilterPillSelect
            label="Session duration"
            icon="⏱️"
            value={duration}
            onChange={(val) => updateParams({ duration: val })}
            options={[
              { label: "30 min", value: "30" },
              { label: "45 min", value: "45" },
              { label: "60 min", value: "60" },
              { label: "90 min", value: "90" },
              { label: "100 min", value: "100" },
              { label: "Clear filter", value: "" },
            ]}
          />

          <FilterPillSelect
            label="Year they teach"
            icon="🎓"
            value={year}
            onChange={(val) => updateParams({ year: val })}
            options={[
              { label: "Year 1", value: "1" },
              { label: "Year 2", value: "2" },
              { label: "Year 3", value: "3" },
              { label: "Year 4", value: "4" },
              { label: "Year 5", value: "5" },
              { label: "Clear filter", value: "" },
            ]}
          />

          <button className="ttClearAll" type="button" onClick={clearAll}>
            Clear all
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ttEmptyPage">
          <div className="ttEmptyTitle">No tutors found</div>
          <div className="ttEmptyText">Try removing some filters or using a simpler keyword.</div>
          <button className="ttClearBtnBig" type="button" onClick={clearAll}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="ttRowsStack">
            <TutorRow
              title="Explore tutors"
              tutors={topTutors}
              onOpenProfile={openProfile}
              onBookNow={bookNow}
            />

            <TutorRow
              title="Study with a peer tutor"
              tutors={newlyJoined}
              onOpenProfile={openProfile}
              onBookNow={bookNow}
            />

            <TutorRow
              title="Our tutors"
              tutors={allTutors}
              onOpenProfile={openProfile}
              onBookNow={bookNow}
            />

            <TutorRow
              title="Learn with fellow students"
              tutors={allTutors}
              onOpenProfile={openProfile}
              onBookNow={bookNow}
            />
          </div>
          <div className="ttEndMessage">
            <img
              src={menotoraCharacter}
              alt="Menotora character"
              className="ttEndImage"
            />

            <div className="ttEndText">
              <div className="ttEndTitle">You’ve reached the end 👋</div>
              <div className="ttEndSubtitle">Happy learning!</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TuteeTutorsPage;