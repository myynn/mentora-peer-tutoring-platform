// imports
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import storage from "../storage";
import { usersApi } from "../api/users";
import Spinner from "../components/Spinner";
import SettingsUserCard from "../components/SettingsUserCard";
import SettingsMenuItem from "../components/SettingsMenuItem";
import LogoutBar from "../components/LogoutBar";
import ConfirmDeleteAccountModal from "../components/ConfirmDeleteAccountModal";
import "../styles/settingsPage.css";

const TutorSettingsPage = () => {
  // hooks
  const navigate = useNavigate();

  // 3. UI state
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [user, setUser] = useState(null);

  // delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // load current user from my localstorage then api
  useEffect(() => {
    const load = async () => {
      try {
        setPageError("");
        setLoading(true);

        //  get logged-in session
        const viewer = storage.getUser();
        if (!viewer) {
          setUser(null);
          return;
        }

        if (viewer.role !== "tutor") {
          setPageError("Only tutor accounts can access this page.");
          setUser(null);
          return;
        }

        // fetch latest user info for display of username and school
        const res = await usersApi.getById(viewer.id);
        setUser(res.data || viewer);
      } catch (e) {
        setPageError(e.message || "Failed to load settings.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // actions
  const goBack = () => navigate(-1);

  const goCancelledSessions = () => {
    navigate("/tutor/cancelled-sessions");
  };


  const openDelete = () => {
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
  };

  const logout = () => {
    storage.logout();
    navigate("/tutor/login", { replace: true });
  };

  const confirmDelete = async () => {
    if (!user?.id) return;

    try {
      setDeleting(true);

      //delete from users table
      await usersApi.delete(user.id);

      //logout + redirect
      storage.logout();
      navigate("/tutor/login", { replace: true });
    } catch (e) {
      //keep modal open but show error on page
      setPageError(e.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  //  LOADING state
  if (loading) {
    return (
      <div className="setPage">
        <div className="setTopBar">
          <button className="setBack" onClick={goBack} aria-label="Back">←</button>
          <div className="setTitle">Settings</div>
          <div className="setTopRight" />
        </div>
        
        <div className="setInner">
          <div className="setCenter">
            <Spinner label="Loading settings..." />
          </div>
        </div>
      </div>
    );
  }

  //  ERROR state
  if (pageError) {
    return (
      <div className="setPage">
        <div className="setTopBar">
          <button className="setBack" onClick={goBack} aria-label="Back">←</button>
          <div className="setTitle">Settings</div>
          <div className="setTopRight" />
        </div>
        
        <div className="setInner">
          <div className="setCenter">
            <div className="pageError">{pageError}</div>
            <button className="setBtnGhost" onClick={goBack}>Go back</button>
          </div>
        </div>
      </div>
    );
  }

  //EMPTY state
  if (!user) {
    return (
      <div className="setPage">
        <div className="setTopBar">
          <button className="setBack" onClick={goBack} aria-label="Back">←</button>
          <div className="setTitle">Settings</div>
          <div className="setTopRight" />
        </div>
        
        <div className="setInner">
          <div className="setCenter">
            <div style={{ textAlign: "center", opacity: 0.85 }}>
              You are not logged in.
            </div>
            <button className="setBtnGhost" onClick={() => navigate("/tutor/login", { replace: true })}>
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  //  DEFAULT state
  return (
    <div className="setPage">
      <div className="setTopBar">
        <button className="setBack" onClick={goBack} aria-label="Back">←</button>
        <div className="setTitle">Settings</div>
        <div className="setTopRight" />
      </div>

      <div className="setInner">
        <div className="setContent">
          <SettingsUserCard user={user} />

          <div className="setMenuGroup">
            <SettingsMenuItem
              icon="cancel"
              label="View all cancelled sessions"
              onClick={goCancelledSessions}
            />

            <SettingsMenuItem
              icon="delete"
              label="Delete account"
              onClick={openDelete}
            />
          </div>

          <LogoutBar onLogout={logout} />
        </div>

        <ConfirmDeleteAccountModal
          open={deleteOpen}
          onClose={closeDelete}
          onConfirm={confirmDelete}
          loading={deleting}
        />
      </div>
    </div>
  );
};

export default TutorSettingsPage;