
import { NavLink, useNavigate } from "react-router";
import "../styles/topnav.css";
import storage from "../storage";
import logo from "../assets/mentora-logo.png";

const TopNavBar = () => {
  const user = storage.getUser();
  const navigate = useNavigate();

  if (!user) return null;

  const isTutor = user.role === "tutor";

  const leftRoute = isTutor ? "/tutor/sessions" : "/tutee/tutors";
  const middleRoute = isTutor ? "/tutor/history" : "/tutee/sessions";

  const leftLabel = isTutor ? "Your sessions" : "Tutors";
  const middleLabel = isTutor ? "History" : "Your sessions";

  const profileRoute = isTutor ? "/tutor/profile" : "/tutee/profile";
  const settingsRoute = isTutor ? "/tutor/settings" : "/tutee/settings";

  const linkClass = ({ isActive }) =>
    isActive ? "navLink navActive" : "navLink";

  return (
    <header className="topNav">
      <div
        className="brand"
        onClick={() => navigate(leftRoute)}
        role="button"
        tabIndex={0}
      >
        <img
          className="brandLogo"
          src={logo}
          alt="Mentora logo"
        />
        <span className="brandText">Mentora</span>
      </div>

      <nav className="navMenu">
        <NavLink to={leftRoute} className={linkClass} end>
          {leftLabel}
        </NavLink>

        <NavLink to={middleRoute} className={linkClass} end>
          {middleLabel}
        </NavLink>

        <NavLink
          to={isTutor ? "/tutor/achievements" : "/tutee/achievements"}
          className={linkClass}
          end
        >
          Achievements
        </NavLink>
      </nav>

      <div className="navIcons">
        <NavLink to={profileRoute} className="iconBtn" aria-label="Profile">
          <span className="material-symbols-outlined">
            account_circle
          </span>
        </NavLink>

        <NavLink to={settingsRoute} className="iconBtn" aria-label="Settings">
          <span className="material-symbols-outlined">
            settings
          </span>
        </NavLink>
      </div>
    </header>
  );
};

export default TopNavBar;
